import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuthUser } from "./users";

// Public Read-Only Query (Enforces Data Minimization)
// "Show a read-only list of available tools (name and category only, no owner details), pulled from Convex."
export const listPublic = query({
  args: {
    category: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let toolsQuery = ctx.db
      .query("tools")
      .withIndex("by_isAvailable", (q) => q.eq("isAvailable", true));

    const tools = await toolsQuery.collect();

    // Data Minimization: STRICTLY return name and category only (plus _id for React keys)
    return tools
      .filter((tool) => {
        if (args.category && args.category !== "All" && tool.category !== args.category) {
          return false;
        }
        if (args.search && !tool.name.toLowerCase().includes(args.search.toLowerCase())) {
          return false;
        }
        return true;
      })
      .map((tool) => ({
        _id: tool._id,
        name: tool.name,
        category: tool.category,
        isAvailable: tool.isAvailable,
      }));
  },
});

// Authenticated Query: Full tool catalog with safe owner badges
export const listAll = query({
  args: {
    category: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tools = await ctx.db.query("tools").order("desc").collect();

    // Enrich with owner information (name, avatar, trusted lender status)
    const enrichedTools = await Promise.all(
      tools.map(async (tool) => {
        const owner = await ctx.db.get(tool.ownerId);
        return {
          _id: tool._id,
          name: tool.name,
          category: tool.category,
          condition: tool.condition,
          description: tool.description,
          imageUrl: tool.imageUrl,
          isAvailable: tool.isAvailable,
          createdAt: tool.createdAt,
          owner: owner
            ? {
                _id: owner._id,
                name: owner.name,
                imageUrl: owner.imageUrl,
                isTrustedLender: owner.isTrustedLender,
              }
            : null,
        };
      })
    );

    return enrichedTools.filter((tool) => {
      if (args.category && args.category !== "All" && tool.category !== args.category) {
        return false;
      }
      if (
        args.search &&
        !tool.name.toLowerCase().includes(args.search.toLowerCase()) &&
        !tool.description.toLowerCase().includes(args.search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  },
});

// Get a single tool with complete details
export const getById = query({
  args: { id: v.id("tools") },
  handler: async (ctx, args) => {
    const tool = await ctx.db.get(args.id);
    if (!tool) return null;

    const owner = await ctx.db.get(tool.ownerId);
    return {
      ...tool,
      owner: owner
        ? {
            _id: owner._id,
            name: owner.name,
            imageUrl: owner.imageUrl,
            isTrustedLender: owner.isTrustedLender,
          }
        : null,
    };
  },
});

// Authenticated user's own listings ("My listings")
export const myTools = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return [];

    return await ctx.db
      .query("tools")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .collect();
  },
});

// Create a new tool listing
export const create = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    condition: v.union(
      v.literal("Brand New"),
      v.literal("Like New"),
      v.literal("Good"),
      v.literal("Fair")
    ),
    description: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthUser(ctx);
    if (!auth.user) {
      throw new Error("User record not found. Please sync user first.");
    }

    // Input validation & sanitation
    const trimmedName = args.name.trim();
    const trimmedDesc = args.description.trim();

    if (!trimmedName || trimmedName.length < 2) {
      throw new Error("Tool name must be at least 2 characters.");
    }

    const toolId = await ctx.db.insert("tools", {
      name: trimmedName,
      category: args.category,
      condition: args.condition,
      description: trimmedDesc,
      imageUrl: args.imageUrl,
      ownerId: auth.user._id,
      ownerClerkId: auth.identity.subject,
      isAvailable: true,
      createdAt: Date.now(),
    });

    await ctx.db.insert("auditLogs", {
      action: "TOOL_LISTED",
      actorClerkId: auth.identity.subject,
      targetId: toolId,
      details: `Listed tool "${trimmedName}" under category "${args.category}"`,
      timestamp: Date.now(),
    });

    return toolId;
  },
});

// Update a tool listing (RBAC: Owner or Admin)
export const update = mutation({
  args: {
    toolId: v.id("tools"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    condition: v.optional(
      v.union(
        v.literal("Brand New"),
        v.literal("Like New"),
        v.literal("Good"),
        v.literal("Fair")
      )
    ),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    isAvailable: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthUser(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw new Error("Tool not found.");

    // RBAC: Only owner or admin can edit
    const isOwner = tool.ownerClerkId === auth.identity.subject;
    const isAdmin = auth.user?.role === "admin";
    if (!isOwner && !isAdmin) {
      throw new Error("Forbidden: You do not have permission to edit this tool.");
    }

    const { toolId, ...patchData } = args;
    await ctx.db.patch(toolId, patchData);

    await ctx.db.insert("auditLogs", {
      action: "TOOL_UPDATED",
      actorClerkId: auth.identity.subject,
      targetId: toolId,
      details: `Tool "${tool.name}" updated by ${isAdmin ? "Admin" : "Owner"}`,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

// Remove a tool listing (RBAC: Owner or Admin)
export const remove = mutation({
  args: {
    toolId: v.id("tools"),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthUser(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw new Error("Tool not found.");

    // RBAC: Only owner or admin can remove
    const isOwner = tool.ownerClerkId === auth.identity.subject;
    const isAdmin = auth.user?.role === "admin";
    if (!isOwner && !isAdmin) {
      throw new Error("Forbidden: You do not have permission to remove this tool.");
    }

    // Check if there are active loans
    const activeRequests = await ctx.db
      .query("borrowRequests")
      .withIndex("by_toolId", (q) => q.eq("toolId", args.toolId))
      .filter((q) => q.eq(q.field("status"), "approved"))
      .collect();

    if (activeRequests.length > 0) {
      throw new Error("Cannot delete a tool that is currently on active loan. Mark as returned first.");
    }

    await ctx.db.delete(args.toolId);

    await ctx.db.insert("auditLogs", {
      action: "TOOL_DELETED",
      actorClerkId: auth.identity.subject,
      targetId: args.toolId,
      details: `Tool "${tool.name}" deleted by ${isAdmin ? "Admin" : "Owner"}`,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

