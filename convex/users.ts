import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Helper to get authenticated identity and user document
export async function getAuthUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
    .unique();

  return { identity, user };
}

// Ensure the caller is authenticated
export async function requireAuthUser(ctx: any) {
  const auth = await getAuthUser(ctx);
  if (!auth || !auth.identity) {
    throw new Error("Unauthorized: Authentication required.");
  }
  return auth;
}

// Get or initialize the currently authenticated user
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const auth = await getAuthUser(ctx);
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
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) {
      // Update profile info if changed
      await ctx.db.patch(existing._id, {
        name: args.name,
        email: args.email,
        imageUrl: args.imageUrl,
      });
      return existing._id;
    }

    // Default to admin if email contains admin keyword or matches environment admin
    const isAdmin =
      args.email.toLowerCase().includes("admin") ||
      args.email.toLowerCase() === "admin@lendloop.org";

    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      name: args.name,
      email: args.email,
      imageUrl: args.imageUrl,
      role: isAdmin ? "admin" : "user",
      isTrustedLender: isAdmin, // Admins start as trusted lenders
      createdAt: Date.now(),
    });

    await ctx.db.insert("auditLogs", {
      action: "USER_REGISTERED",
      actorClerkId: args.clerkId,
      targetId: userId,
      details: `User ${args.name} (${args.email}) registered with role ${isAdmin ? "admin" : "user"}`,
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
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthUser(ctx);
    if (!auth.user || auth.user.role !== "admin") {
      throw new Error("Forbidden: Admin privileges required.");
    }

    const target = await ctx.db.get(args.targetUserId);
    if (!target) throw new Error("User not found.");

    const newStatus = !target.isTrustedLender;
    await ctx.db.patch(target._id, {
      isTrustedLender: newStatus,
    });

    await ctx.db.insert("auditLogs", {
      action: "TRUSTED_LENDER_TOGGLED",
      actorClerkId: auth.identity.subject,
      targetId: target._id,
      details: `Admin changed trusted lender status of ${target.name} to ${newStatus}`,
      timestamp: Date.now(),
    });

    return { success: true, isTrustedLender: newStatus };
  },
});

// Admin-only: set role
export const setUserRole = mutation({
  args: {
    targetUserId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthUser(ctx);
    if (!auth.user || auth.user.role !== "admin") {
      throw new Error("Forbidden: Admin privileges required.");
    }

    const target = await ctx.db.get(args.targetUserId);
    if (!target) throw new Error("User not found.");

    await ctx.db.patch(target._id, {
      role: args.role,
    });

    await ctx.db.insert("auditLogs", {
      action: "ROLE_CHANGED",
      actorClerkId: auth.identity.subject,
      targetId: target._id,
      details: `Admin set role of ${target.name} to ${args.role}`,
      timestamp: Date.now(),
    });

    return { success: true, role: args.role };
  },
});

