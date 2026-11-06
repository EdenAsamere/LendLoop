import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuthUser } from "./authUtils";

// Toggle a tool as favorite (add if not present, remove if present)
export const toggle = mutation({
  args: {
    toolId: v.id("tools"),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthUser(ctx, args.clerkId);
    if (!auth.user) throw new ConvexError("User record not found.");

    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw new ConvexError("Tool not found.");

    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_user_tool", (q) =>
        q.eq("userClerkId", auth.identity.subject).eq("toolId", args.toolId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { isFavorited: false };
    } else {
      await ctx.db.insert("favorites", {
        userId: auth.user._id,
        userClerkId: auth.identity.subject,
        toolId: args.toolId,
        createdAt: Date.now(),
      });
      return { isFavorited: true };
    }
  },
});

// Remove a tool from favorites explicitly
export const remove = mutation({
  args: {
    toolId: v.id("tools"),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthUser(ctx, args.clerkId);
    if (!auth.user) throw new ConvexError("User record not found.");

    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_user_tool", (q) =>
        q.eq("userClerkId", auth.identity.subject).eq("toolId", args.toolId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { success: true };
    }
    return { success: false };
  },
});

// Get array of favorite tool IDs for the authenticated user (fast client lookup)
export const listMyFavoriteToolIds = query({
  args: { clerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const effectiveClerkId = identity?.subject || args.clerkId;
    if (!effectiveClerkId) return [];

    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_userClerkId", (q) => q.eq("userClerkId", effectiveClerkId))
      .collect();

    return favorites.map((f) => f.toolId);
  },
});

// Get full tool records for all favorited tools by the authenticated user
export const listMyFavorites = query({
  args: { clerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const effectiveClerkId = identity?.subject || args.clerkId;
    if (!effectiveClerkId) return [];

    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_userClerkId", (q) => q.eq("userClerkId", effectiveClerkId))
      .collect();

    const toolsWithDetails = await Promise.all(
      favorites.map(async (fav) => {
        const tool = await ctx.db.get(fav.toolId);
        if (!tool) return null;

        const owner = await ctx.db.get(tool.ownerId);
        return {
          ...tool,
          owner: owner
            ? {
                name: owner.name,
                imageUrl: owner.imageUrl,
                isTrustedLender: owner.isTrustedLender,
              }
            : undefined,
          favoritedAt: fav.createdAt,
        };
      })
    );

    return toolsWithDetails.filter((t): t is NonNullable<typeof t> => t !== null);
  },
});
