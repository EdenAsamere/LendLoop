import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAuthUser } from "./authUtils";

// Create a borrow request
export const create = mutation({
  args: {
    toolId: v.id("tools"),
    startDate: v.string(), // YYYY-MM-DD
    endDate: v.string(),   // YYYY-MM-DD
    notes: v.optional(v.string()),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthUser(ctx, args.clerkId);
    if (!auth.user) throw new ConvexError("User record not found. Please sign in.");

    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw new ConvexError("Tool not found.");

    if (tool.ownerClerkId === auth.identity.subject) {
      throw new ConvexError("You cannot borrow your own tool.");
    }

    // Prevent duplicate active or pending borrow requests for the same tool by the same individual
    const existingActiveRequests = await ctx.db
      .query("borrowRequests")
      .withIndex("by_borrowerClerkId", (q) =>
        q.eq("borrowerClerkId", auth.identity.subject)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("toolId"), args.toolId),
          q.or(
            q.eq(q.field("status"), "pending"),
            q.eq(q.field("status"), "approved")
          )
        )
      )
      .collect();

    if (existingActiveRequests.length > 0) {
      const activeReq = existingActiveRequests[0];
      if (activeReq.status === "pending") {
        throw new ConvexError(
          "You already have a pending borrow request for this item. Please wait for the owner to respond."
        );
      } else {
        throw new ConvexError(
          "You already have an active approved loan for this item."
        );
      }
    }

    if (!tool.isAvailable) {
      throw new ConvexError("This tool is currently not available for borrowing.");
    }

    // Validate dates and limits
    const start = new Date(args.startDate);
    const end = new Date(args.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ConvexError("Invalid date format. Expected YYYY-MM-DD.");
    }
    if (end < start) {
      throw new ConvexError("Return date cannot be earlier than start date.");
    }

    // Limit loan duration to 180 days to prevent indefinite resource lock
    const durationDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (durationDays > 180) {
      throw new ConvexError("Loan duration cannot exceed 180 days.");
    }

    const trimmedNotes = args.notes?.trim();
    if (trimmedNotes && trimmedNotes.length > 1000) {
      throw new ConvexError("Notes cannot exceed 1000 characters.");
    }

    const owner = await ctx.db.get(tool.ownerId);
    if (!owner) throw new ConvexError("Tool owner record not found.");

    const requestId = await ctx.db.insert("borrowRequests", {
      toolId: args.toolId,
      borrowerId: auth.user._id,
      borrowerClerkId: auth.identity.subject,
      borrowerName: auth.user.name,
      borrowerEmail: auth.user.email,
      ownerId: tool.ownerId,
      ownerClerkId: tool.ownerClerkId,
      ownerName: owner.name,
      ownerEmail: owner.email,
      startDate: args.startDate,
      endDate: args.endDate,
      status: "pending",
      notes: trimmedNotes,
      createdAt: Date.now(),
    });

    await ctx.db.insert("auditLogs", {
      action: "REQUEST_CREATED",
      actorClerkId: auth.identity.subject,
      targetId: requestId,
      details: `${auth.user.name} requested to borrow "${tool.name}" from ${owner.name} (${args.startDate} to ${args.endDate})`,
      timestamp: Date.now(),
    });

    // Dispatch asynchronous webhook to n8n (data-minimized payload)
    await ctx.scheduler.runAfter(0, internal.notifications.dispatchWebhook, {
      event: "REQUEST_CREATED",
      payload: {
        requestId,
        toolId: tool._id,
        toolName: tool.name,
        borrowerName: auth.user.name,
        ownerName: owner.name,
        ownerEmail: owner.email,
        startDate: args.startDate,
        endDate: args.endDate,
        notes: trimmedNotes,
      },
    });

    return requestId;
  },
});

// Update borrow request status (Approve, Reject, Return, Cancel)
export const updateStatus = mutation({
  args: {
    requestId: v.id("borrowRequests"),
    status: v.union(
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("returned"),
      v.literal("cancelled")
    ),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthUser(ctx, args.clerkId);
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new ConvexError("Borrow request not found.");

    const tool = await ctx.db.get(request.toolId);
    if (!tool) throw new ConvexError("Associated tool not found.");

    const isOwner = request.ownerClerkId === auth.identity.subject;
    const isBorrower = request.borrowerClerkId === auth.identity.subject;
    const isAdmin = auth.user?.role === "admin";

    // RBAC Authorization Matrix
    if (args.status === "cancelled") {
      if (!isBorrower && !isAdmin) {
        throw new ConvexError("Forbidden: Only the borrower can cancel their request.");
      }
      if (request.status !== "pending") {
        throw new ConvexError("Only pending requests can be cancelled.");
      }
    } else if (args.status === "approved" || args.status === "rejected") {
      if (!isOwner && !isAdmin) {
        throw new ConvexError("Forbidden: Only the tool owner or admin can approve/reject this request.");
      }
      if (request.status !== "pending") {
        throw new ConvexError(`Cannot change status: request is already ${request.status}.`);
      }
    } else if (args.status === "returned") {
      if (!isOwner && !isAdmin) {
        throw new ConvexError("Forbidden: Only the tool owner or admin can mark a tool as returned.");
      }
      if (request.status !== "approved") {
        throw new ConvexError("Only currently approved active loans can be marked as returned.");
      }
    }

    // Apply updates based on status
    const now = Date.now();
    const patchData: any = { status: args.status };

    if (args.status === "approved") {
      patchData.approvedAt = now;
      // Mark tool as unavailable
      await ctx.db.patch(tool._id, { isAvailable: false });
    } else if (args.status === "returned") {
      patchData.returnedAt = now;
      // Mark tool as available again
      await ctx.db.patch(tool._id, { isAvailable: true });
    }

    await ctx.db.patch(request._id, patchData);

    const eventName =
      args.status === "approved"
        ? "REQUEST_APPROVED"
        : args.status === "rejected"
        ? "REQUEST_REJECTED"
        : args.status === "returned"
        ? "REQUEST_RETURNED"
        : "REQUEST_CANCELLED";

    await ctx.db.insert("auditLogs", {
      action: eventName,
      actorClerkId: auth.identity.subject,
      targetId: request._id,
      details: `Request for "${tool.name}" transitioned to "${args.status}" by ${
        isAdmin ? "Admin" : isOwner ? "Owner" : "Borrower"
      }`,
      timestamp: now,
    });

    // Asynchronously dispatch webhook to n8n with data-minimized payload
    await ctx.scheduler.runAfter(0, internal.notifications.dispatchWebhook, {
      event: eventName,
      payload: {
        requestId: request._id,
        toolId: tool._id,
        toolName: tool.name,
        borrowerName: request.borrowerName,
        borrowerEmail: request.borrowerEmail,
        ownerName: request.ownerName,
        ownerEmail: request.ownerEmail,
        status: args.status,
        startDate: request.startDate,
        endDate: request.endDate,
        timestamp: now,
      },
    });

    return { success: true, status: args.status };
  },
});

// Borrower's view: "My requests"
export const myRequests = query({
  args: { clerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const effectiveClerkId = identity?.subject || args.clerkId;
    if (!effectiveClerkId) return [];

    const requests = await ctx.db
      .query("borrowRequests")
      .withIndex("by_borrowerClerkId", (q) => q.eq("borrowerClerkId", effectiveClerkId))
      .order("desc")
      .collect();

    return await Promise.all(
      requests.map(async (req) => {
        const tool = await ctx.db.get(req.toolId);
        return {
          ...req,
          toolName: tool?.name || "Unknown Tool",
          toolCategory: tool?.category || "General",
        };
      })
    );
  },
});

// Tool owner's view: "Incoming requests"
export const incomingRequests = query({
  args: { clerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const effectiveClerkId = identity?.subject || args.clerkId;
    if (!effectiveClerkId) return [];

    const requests = await ctx.db
      .query("borrowRequests")
      .withIndex("by_ownerClerkId", (q) => q.eq("ownerClerkId", effectiveClerkId))
      .order("desc")
      .collect();

    return await Promise.all(
      requests.map(async (req) => {
        const tool = await ctx.db.get(req.toolId);
        return {
          ...req,
          toolName: tool?.name || "Unknown Tool",
          toolCategory: tool?.category || "General",
        };
      })
    );
  },
});

// Tool IDs currently requested (pending or approved) by the active borrower
export const myActiveRequestedToolIds = query({
  args: { clerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const effectiveClerkId = identity?.subject || args.clerkId;
    if (!effectiveClerkId) return [];

    const requests = await ctx.db
      .query("borrowRequests")
      .withIndex("by_borrowerClerkId", (q) => q.eq("borrowerClerkId", effectiveClerkId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "approved")
        )
      )
      .collect();

    return requests.map((r) => r.toolId);
  },
});


