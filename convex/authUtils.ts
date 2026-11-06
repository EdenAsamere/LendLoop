import { ConvexError } from "convex/values";

// Authentication helper utilities for server-side Convex functions
export async function getAuthUser(ctx: any, fallbackClerkId?: string) {
  const identity = await ctx.auth.getUserIdentity();
  
  // Security: If cryptographically verified identity exists, it is the sole ground truth.
  // Prevent caller from spoofing another user via fallback argument.
  if (identity && fallbackClerkId && identity.subject !== fallbackClerkId) {
    throw new ConvexError("Unauthorized: Security validation failed (ID mismatch).");
  }

  const effectiveClerkId = identity?.subject || fallbackClerkId;

  if (!effectiveClerkId) {
    return null;
  }

  let user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", effectiveClerkId))
    .unique();

  // If authenticated with Clerk but not yet provisioned in Convex users table, auto-provision
  if (!user && typeof ctx.db.insert === "function") {
    const userCount = (await ctx.db.query("users").take(1)).length;
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const email = identity?.email?.trim().toLowerCase() || "";
    
    // Strict RBAC: If ADMIN_EMAIL is set, only that exact address can receive admin privileges.
    // If not set, only the initial bootstrap user (#1) is assigned admin.
    const isAdmin = adminEmail ? email === adminEmail : userCount === 0;

    const userId = await ctx.db.insert("users", {
      clerkId: effectiveClerkId,
      name: identity?.name || identity?.givenName || (email ? email.split("@")[0] : "Neighbor"),
      email: identity?.email || "",
      imageUrl: identity?.pictureUrl || undefined,
      role: isAdmin ? "admin" : "user",
      isTrustedLender: isAdmin,
      createdAt: Date.now(),
    });

    user = await ctx.db.get(userId);
  }

  return { identity: identity || { subject: effectiveClerkId }, user };
}

export async function requireAuthUser(ctx: any, fallbackClerkId?: string) {
  const auth = await getAuthUser(ctx, fallbackClerkId);
  if (!auth || !auth.identity) {
    throw new ConvexError("Unauthorized: Authentication required. Please sign in.");
  }
  return auth;
}

export type UserRole = "user" | "moderator" | "admin";

// Hierarchical / Multi-Role RBAC Guard
export async function requireRole(
  ctx: any,
  allowedRoles: UserRole[],
  fallbackClerkId?: string
) {
  const auth = await requireAuthUser(ctx, fallbackClerkId);
  const userRole = (auth.user?.role as UserRole) || "user";
  
  if (!allowedRoles.includes(userRole)) {
    throw new ConvexError(
      `Forbidden: Action requires one of [${allowedRoles.join(", ")}] roles. Current role: ${userRole}.`
    );
  }
  
  return { ...auth, role: userRole };
}

export async function requireAdmin(ctx: any, fallbackClerkId?: string) {
  return requireRole(ctx, ["admin"], fallbackClerkId);
}

export async function requireModeratorOrAdmin(ctx: any, fallbackClerkId?: string) {
  return requireRole(ctx, ["moderator", "admin"], fallbackClerkId);
}
