import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUser, requireAuthUser } from "./authUtils";

// Get or initialize the currently authenticated user
export const getCurrentUser = query({
  args: { clerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const auth = await getAuthUser(ctx, args.clerkId);
    if (!auth || !auth.user) {
      return null;
    }
    return auth.user;
  },
});

// Sync user from client session or Clerk webhook
export const syncUser = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity && identity.subject !== args.clerkId) {
      throw new ConvexError("Unauthorized: Identity verification failed.");
    }

    // Input sanitization and length limits (OWASP A03 / A08)
    const sanitizedName = args.name.trim().slice(0, 100);
    const sanitizedEmail = args.email.trim().toLowerCase().slice(0, 150);
    let sanitizedImageUrl = args.imageUrl?.trim();

    if (sanitizedImageUrl) {
      const isHttp = sanitizedImageUrl.startsWith("https://") || sanitizedImageUrl.startsWith("http://");
      const isSafeData = sanitizedImageUrl.startsWith("data:image/");
      if (!isHttp && !isSafeData) {
        sanitizedImageUrl = undefined;
      }
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) {
      const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
      const shouldBeAdmin = adminEmail && sanitizedEmail === adminEmail;

      const patchData: any = {
        name: sanitizedName,
        email: sanitizedEmail,
        imageUrl: sanitizedImageUrl,
      };

      if (shouldBeAdmin && existing.role !== "admin") {
        patchData.role = "admin";
        patchData.isTrustedLender = true;
      }

      await ctx.db.patch(existing._id, patchData);
      return existing._id;
    }

    const userCount = (await ctx.db.query("users").take(1)).length;
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    // Strict RBAC: If ADMIN_EMAIL is set, only that exact address can receive admin privileges.
    // If not set, only the initial bootstrap user (#1) is assigned admin.
    const isAdmin = adminEmail ? sanitizedEmail === adminEmail : userCount === 0;

    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      name: sanitizedName,
      email: sanitizedEmail,
      imageUrl: sanitizedImageUrl,
      role: isAdmin ? "admin" : "user",
      isTrustedLender: isAdmin, // Initial admin starts as trusted lender
      createdAt: Date.now(),
    });

    await ctx.db.insert("auditLogs", {
      action: "USER_REGISTERED",
      actorClerkId: args.clerkId,
      targetId: userId,
      details: `User ${sanitizedName} (${sanitizedEmail}) registered with role ${isAdmin ? "admin" : "user"}`,
      timestamp: Date.now(),
    });

    return userId;
  },
});

// Safe public/authenticated profile retrieval (data-minimized)
export const getProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    // Data minimization: omit email and clerkId from general lookups
    return {
      _id: user._id,
      name: user.name,
      imageUrl: user.imageUrl,
      role: user.role,
      isTrustedLender: user.isTrustedLender,
      createdAt: user.createdAt,
    };
  },
});

// Admin-only: toggle trusted lender status
export const toggleTrustedLender = mutation({
  args: {
    targetUserId: v.id("users"),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthUser(ctx, args.clerkId);
    if (!auth.user || auth.user.role !== "admin") {
      throw new ConvexError("Forbidden: Admin privileges required.");
    }

    const target = await ctx.db.get(args.targetUserId);
    if (!target) throw new ConvexError("User not found.");

    const newStatus = !target.isTrustedLender;
    await ctx.db.patch(target._id, {
      isTrustedLender: newStatus,
    });

    await ctx.db.insert("auditLogs", {
      action: "TRUSTED_LENDER_TOGGLED",
      actorClerkId: auth.identity.subject,
      actorRole: "admin",
      targetId: target._id,
      targetType: "USER",
      details: `Admin changed trusted lender status of ${target.name} to ${newStatus}`,
      timestamp: Date.now(),
    });

    return { success: true, isTrustedLender: newStatus };
  },
});

// Admin-only: set role (Real Production RBAC Governance)
export const setUserRole = mutation({
  args: {
    targetUserId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("moderator"), v.literal("admin")),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthUser(ctx, args.clerkId);
    if (!auth.user || auth.user.role !== "admin") {
      throw new ConvexError("Forbidden: Administrator privileges required to manage roles.");
    }

    const target = await ctx.db.get(args.targetUserId);
    if (!target) throw new ConvexError("User record not found.");

    // Prevent sole admin from demoting themselves (prevents system lockout)
    if (target._id === auth.user._id && args.role !== "admin") {
      const allAdmins = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("role"), "admin"))
        .collect();
      if (allAdmins.length <= 1) {
        throw new ConvexError("Security Policy: Cannot demote the sole administrator of the system.");
      }
    }

    const previousRole = target.role;
    await ctx.db.patch(target._id, {
      role: args.role,
    });

    await ctx.db.insert("auditLogs", {
      action: "ROLE_CHANGED",
      actorClerkId: auth.identity.subject,
      actorRole: "admin",
      targetId: target._id,
      targetType: "USER",
      details: `Administrator "${auth.user.name}" updated role of "${target.name}" from "${previousRole}" to "${args.role}"`,
      timestamp: Date.now(),
    });

    return { success: true, role: args.role };
  },
});

// Upfront Administrative Seeding (Automated setup with mandatory first-login password update)
export const seedAdminUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const cleanEmail = args.email.trim().toLowerCase();

    // Demote any previous admin accounts who do not match the designated ADMIN_EMAIL
    const allUsers = await ctx.db.query("users").collect();
    for (const u of allUsers) {
      if (u.role === "admin" && u.email !== cleanEmail) {
        await ctx.db.patch(u._id, {
          role: "user",
          isTrustedLender: false,
          mustChangePassword: false,
        });
        await ctx.db.insert("auditLogs", {
          action: "ROLE_REVOKED",
          actorClerkId: "system:seeder",
          actorRole: "system",
          targetId: u._id,
          targetType: "USER",
          details: `Admin privileges revoked from ${u.email} during admin rotation to ${cleanEmail}.`,
          timestamp: Date.now(),
        });
      }
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", cleanEmail))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        clerkId: args.clerkId,
        role: "admin",
        isTrustedLender: true,
        mustChangePassword: true,
      });

      await ctx.db.insert("auditLogs", {
        action: "ADMIN_ACCOUNT_SEEDED",
        actorClerkId: "system:seeder",
        actorRole: "system",
        targetId: existing._id,
        targetType: "USER",
        details: `Administrator privileges assigned to existing account "${cleanEmail}" with mandatory initial password reset flag.`,
        timestamp: Date.now(),
      });

      return { status: "updated", userId: existing._id };
    }

    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      name: args.name,
      email: cleanEmail,
      role: "admin",
      isTrustedLender: true,
      mustChangePassword: true,
      createdAt: Date.now(),
    });

    await ctx.db.insert("auditLogs", {
      action: "ADMIN_ACCOUNT_SEEDED",
      actorClerkId: "system:seeder",
      actorRole: "system",
      targetId: userId,
      targetType: "USER",
      details: `Initial administrator account provisioned for "${cleanEmail}" with mandatory initial password reset flag.`,
      timestamp: Date.now(),
    });

    return { status: "created", userId };
  },
});

// Acknowledges completion of first-time mandatory password change
export const completePasswordChange = mutation({
  args: {
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthUser(ctx, args.clerkId);
    if (!auth.user) throw new ConvexError("User not found.");

    await ctx.db.patch(auth.user._id, {
      mustChangePassword: false,
    });

    await ctx.db.insert("auditLogs", {
      action: "PASSWORD_INITIAL_CHANGE_COMPLETED",
      actorClerkId: auth.identity.subject,
      actorRole: auth.user.role,
      targetId: auth.user._id,
      targetType: "USER",
      details: `User "${auth.user.name}" completed mandatory first-time password update.`,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

