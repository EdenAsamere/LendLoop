import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuthUser, requireModeratorOrAdmin } from "./authUtils";

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
        imageUrl: tool.imageUrl,
        isCertified: tool.isCertified,
      }));
  },
});

// Authenticated Query: Full tool catalog with safe owner badges & safety certification
export const listAll = query({
  args: {
    category: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tools = await ctx.db.query("tools").order("desc").collect();

    // Enrich with owner information (name, avatar, trusted lender status) and safety badges
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
          isCertified: tool.isCertified ?? false,
          certifiedBy: tool.certifiedBy,
          certifiedAt: tool.certifiedAt,
          safetyNotes: tool.safetyNotes,
          isFlagged: tool.isFlagged ?? false,
          flagReason: tool.flagReason,
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
  args: { clerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const effectiveClerkId = identity?.subject || args.clerkId;
    if (!effectiveClerkId) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", effectiveClerkId))
      .unique();

    if (!user) return [];

    return await ctx.db
      .query("tools")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .collect();
  },
});

const VALID_CATEGORIES = new Set([
  "Power Tools",
  "Hand Tools",
  "Gardening",
  "Woodworking",
  "Automotive",
  "Outdoor & Camping",
  "Cleaning & Maintenance",
  "Other",
]);

function validateImageUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 500_000) {
    throw new ConvexError("Image data exceeds maximum allowed size.");
  }
  const isHttp = /^https?:\/\//i.test(trimmed);
  const isSafeDataUri = /^data:image\/(jpeg|png|webp|gif|svg\+xml);base64,/i.test(trimmed);
  if (!isHttp && !isSafeDataUri) {
    throw new ConvexError("Invalid image URL. Must be an http(s) URL or valid image data.");
  }
  return trimmed;
}

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
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthUser(ctx, args.clerkId);
    if (!auth.user) {
      throw new ConvexError("User record not found. Please sync user first.");
    }

    // Input validation & sanitation
    const trimmedName = args.name.trim();
    const trimmedDesc = args.description.trim();

    if (!trimmedName || trimmedName.length < 2) {
      throw new ConvexError("Tool name must be at least 2 characters.");
    }
    if (trimmedName.length > 100) {
      throw new ConvexError("Tool name cannot exceed 100 characters.");
    }
    if (trimmedDesc.length > 3000) {
      throw new ConvexError("Description cannot exceed 3000 characters.");
    }
    if (!VALID_CATEGORIES.has(args.category)) {
      throw new ConvexError(`Invalid category: "${args.category}".`);
    }

    const safeImageUrl = validateImageUrl(args.imageUrl);

    const toolId = await ctx.db.insert("tools", {
      name: trimmedName,
      category: args.category,
      condition: args.condition,
      description: trimmedDesc,
      imageUrl: safeImageUrl,
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
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthUser(ctx, args.clerkId);
    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw new ConvexError("Tool not found.");

    // RBAC: Only owner or admin can edit
    const isOwner = tool.ownerClerkId === auth.identity.subject;
    const isAdmin = auth.user?.role === "admin";
    if (!isOwner && !isAdmin) {
      throw new ConvexError("Forbidden: You do not have permission to edit this tool.");
    }

    const patchData: {
      name?: string;
      category?: string;
      condition?: "Brand New" | "Like New" | "Good" | "Fair";
      description?: string;
      imageUrl?: string;
      isAvailable?: boolean;
    } = {};

    if (args.name !== undefined) {
      const trimmed = args.name.trim();
      if (trimmed.length < 2 || trimmed.length > 100) {
        throw new ConvexError("Tool name must be between 2 and 100 characters.");
      }
      patchData.name = trimmed;
    }

    if (args.category !== undefined) {
      if (!VALID_CATEGORIES.has(args.category)) {
        throw new ConvexError(`Invalid category: "${args.category}".`);
      }
      patchData.category = args.category;
    }

    if (args.condition !== undefined) {
      patchData.condition = args.condition;
    }

    if (args.description !== undefined) {
      const trimmed = args.description.trim();
      if (trimmed.length > 3000) {
        throw new ConvexError("Description cannot exceed 3000 characters.");
      }
      patchData.description = trimmed;
    }

    if (args.imageUrl !== undefined) {
      patchData.imageUrl = validateImageUrl(args.imageUrl);
    }

    if (args.isAvailable !== undefined) {
      patchData.isAvailable = args.isAvailable;
    }

    await ctx.db.patch(args.toolId, patchData);

    await ctx.db.insert("auditLogs", {
      action: "TOOL_UPDATED",
      actorClerkId: auth.identity.subject,
      targetId: args.toolId,
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
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthUser(ctx, args.clerkId);
    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw new ConvexError("Tool not found.");

    // RBAC: Only owner or admin can remove
    const isOwner = tool.ownerClerkId === auth.identity.subject;
    const isAdmin = auth.user?.role === "admin";
    if (!isOwner && !isAdmin) {
      throw new ConvexError("Forbidden: You do not have permission to remove this tool.");
    }

    // Check if there are active loans
    const activeRequests = await ctx.db
      .query("borrowRequests")
      .withIndex("by_toolId", (q) => q.eq("toolId", args.toolId))
      .filter((q) => q.eq(q.field("status"), "approved"))
      .collect();

    if (activeRequests.length > 0) {
      throw new ConvexError("Cannot delete a tool that is currently on active loan. Mark as returned first.");
    }

    await ctx.db.delete(args.toolId);

    await ctx.db.insert("auditLogs", {
      action: "TOOL_DELETED",
      actorClerkId: auth.identity.subject,
      actorRole: isAdmin ? "admin" : "owner",
      targetId: args.toolId,
      targetType: "TOOL",
      details: `Tool "${tool.name}" deleted by ${isAdmin ? "Admin" : "Owner"}`,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

// Regulatory & Safety Compliance: Certify a tool (RBAC: Moderator or Admin)
export const certifyTool = mutation({
  args: {
    toolId: v.id("tools"),
    isCertified: v.boolean(),
    safetyNotes: v.optional(v.string()),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireModeratorOrAdmin(ctx, args.clerkId);
    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw new ConvexError("Tool not found.");

    const now = Date.now();
    const patchData: any = {
      isCertified: args.isCertified,
      certifiedBy: args.isCertified ? auth.user?.name || "Safety Inspector" : undefined,
      certifiedAt: args.isCertified ? now : undefined,
      safetyNotes: args.safetyNotes?.trim().slice(0, 500),
    };

    if (args.isCertified) {
      // Clear flag and restore availability if certified
      patchData.isFlagged = false;
      patchData.flagReason = undefined;
      patchData.isAvailable = true;
    }

    await ctx.db.patch(args.toolId, patchData);

    await ctx.db.insert("auditLogs", {
      action: args.isCertified ? "TOOL_SAFETY_CERTIFIED" : "TOOL_CERTIFICATION_REVOKED",
      actorClerkId: auth.identity.subject,
      actorRole: auth.role,
      targetId: args.toolId,
      targetType: "TOOL",
      details: `${auth.role.toUpperCase()} "${auth.user?.name}" ${
        args.isCertified ? "certified safety compliance for" : "revoked safety certification for"
      } "${tool.name}"${args.safetyNotes ? ` - Notes: ${args.safetyNotes}` : ""}`,
      timestamp: now,
    });

    return { success: true, isCertified: args.isCertified };
  },
});

// Regulatory & Safety: Flag tool for safety review (Freezes lending until certified)
export const flagTool = mutation({
  args: {
    toolId: v.id("tools"),
    reason: v.string(),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthUser(ctx, args.clerkId);
    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw new ConvexError("Tool not found.");

    const trimmedReason = args.reason.trim().slice(0, 500);
    if (!trimmedReason) {
      throw new ConvexError("A reason must be provided when flagging an item for safety review.");
    }

    // Freeze tool availability to protect community members
    await ctx.db.patch(args.toolId, {
      isFlagged: true,
      flagReason: trimmedReason,
      isAvailable: false,
    });

    await ctx.db.insert("auditLogs", {
      action: "TOOL_SAFETY_FLAGGED",
      actorClerkId: auth.identity.subject,
      actorRole: auth.user?.role || "user",
      targetId: args.toolId,
      targetType: "TOOL",
      details: `Tool "${tool.name}" flagged for safety review: "${trimmedReason}" by ${auth.user?.name}`,
      timestamp: Date.now(),
    });

    return { success: true, isFlagged: true };
  },
});

// Compliance & Safety Steward Queue: View uncertified or flagged items
export const listPendingInspection = query({
  args: { clerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const auth = await requireModeratorOrAdmin(ctx, args.clerkId);

    const tools = await ctx.db.query("tools").order("desc").collect();

    // Filter for tools needing inspection (uncertified or flagged)
    const inspectionQueue = tools.filter((t) => !t.isCertified || t.isFlagged);

    return await Promise.all(
      inspectionQueue.map(async (tool) => {
        const owner = await ctx.db.get(tool.ownerId);
        return {
          ...tool,
          ownerName: owner?.name || "Unknown Owner",
          ownerEmail: owner?.email || "",
        };
      })
    );
  },
});

