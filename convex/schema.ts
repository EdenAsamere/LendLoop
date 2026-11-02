import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
    role: v.union(v.literal("user"), v.literal("admin")),
    isTrustedLender: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  tools: defineTable({
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
    ownerId: v.id("users"),
    ownerClerkId: v.string(),
    isAvailable: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_ownerClerkId", ["ownerClerkId"])
    .index("by_category", ["category"])
    .index("by_isAvailable", ["isAvailable"]),

  borrowRequests: defineTable({
    toolId: v.id("tools"),
    borrowerId: v.id("users"),
    borrowerClerkId: v.string(),
    borrowerName: v.string(),
    borrowerEmail: v.string(),
    ownerId: v.id("users"),
    ownerClerkId: v.string(),
    ownerName: v.string(),
    ownerEmail: v.string(),
    startDate: v.string(), // YYYY-MM-DD
    endDate: v.string(), // YYYY-MM-DD
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("returned"),
      v.literal("cancelled")
    ),
    notes: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
    returnedAt: v.optional(v.number()),
    lastRemindedAt: v.optional(v.number()),
    reminderCount: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_borrowerId", ["borrowerId"])
    .index("by_borrowerClerkId", ["borrowerClerkId"])
    .index("by_ownerId", ["ownerId"])
    .index("by_ownerClerkId", ["ownerClerkId"])
    .index("by_toolId", ["toolId"])
    .index("by_status", ["status"]),

  auditLogs: defineTable({
    action: v.string(),
    actorClerkId: v.optional(v.string()),
    targetId: v.optional(v.string()),
    details: v.string(),
    timestamp: v.number(),
  }).index("by_action", ["action"]),

  remindersLog: defineTable({
    idempotencyKey: v.string(),
    borrowRequestId: v.id("borrowRequests"),
    sentAt: v.number(),
    channel: v.string(),
  }).index("by_idempotency_key", ["idempotencyKey"]),
});
