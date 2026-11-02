import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAuthUser } from "./users";

// Create a borrow request
export const create = mutation({
  args: {
    toolId: v.id("tools"),
    startDate: v.string(), // YYYY-MM-DD
    endDate: v.string(),   // YYYY-MM-DD
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthUser(ctx);
    if (!auth.user) throw new Error("User record not found.");

    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw new Error("Tool not found.");

    if (tool.ownerClerkId === auth.identity.subject) {
      throw new Error("You cannot borrow your own tool.");
    }

    if (!tool.isAvailable) {
      throw new Error("This tool is currently not available for borrowing.");
    }

    // Validate dates
    const start = new Date(args.startDate);
    const end = new Date(args.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error("Invalid date format. Expected YYYY-MM-DD.");
    }
    if (end < start) {
      throw new Error("Return date cannot be earlier than start date.");
    }

    const owner = await ctx.db.get(tool.ownerId);
    if (!owner) throw new Error("Tool owner record not found.");

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
      notes: args.notes?.trim(),
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
        notes: args.notes,
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
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthUser(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Borrow request not found.");

    const tool = await ctx.db.get(request.toolId);
    if (!tool) throw new Error("Associated tool not found.");

    const isOwner = request.ownerClerkId === auth.identity.subject;
    const isBorrower = request.borrowerClerkId === auth.identity.subject;
    const isAdmin = auth.user?.role === "admin";

    // RBAC Authorization Matrix
    if (args.status === "cancelled") {
      if (!isBorrower && !isAdmin) {
        throw new Error("Forbidden: Only the borrower can cancel their request.");
      }
      if (request.status !== "pending") {
        throw new Error("Only pending requests can be cancelled.");
      }
    } else if (args.status === "approved" || args.status === "rejected") {
      if (!isOwner && !isAdmin) {
        throw new Error("Forbidden: Only the tool owner or admin can approve/reject this request.");
      }
      if (request.status !== "pending") {
        throw new Error(`Cannot change status: request is already ${request.status}.`);
      }
    } else if (args.status === "returned") {
      if (!isOwner && !isAdmin) {
        throw new Error("Forbidden: Only the tool owner or admin can mark a tool as returned.");
      }
      if (request.status !== "approved") {
        throw new Error("Only currently approved active loans can be marked as returned.");
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
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const requests = await ctx.db
      .query("borrowRequests")
      .withIndex("by_borrowerClerkId", (q) => q.eq("borrowerClerkId", identity.subject))
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
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const requests = await ctx.db
      .query("borrowRequests")
      .withIndex("by_ownerClerkId", (q) => q.eq("ownerClerkId", identity.subject))
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
