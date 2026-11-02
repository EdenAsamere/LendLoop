import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuthUser } from "./users";

// Admin Query: View all loans / requests across the platform
export const listAllLoans = query({
  args: {},
  handler: async (ctx) => {
    const auth = await requireAuthUser(ctx);
    if (!auth.user || auth.user.role !== "admin") {
      throw new Error("Forbidden: Admin privileges required.");
    }

    const loans = await ctx.db.query("borrowRequests").order("desc").collect();
    const now = new Date();

    return await Promise.all(
      loans.map(async (loan) => {
        const tool = await ctx.db.get(loan.toolId);
        const endDate = new Date(loan.endDate);
        endDate.setHours(23, 59, 59, 999);
        const isOverdue = loan.status === "approved" && endDate < now;
        const diffMs = now.getTime() - endDate.getTime();
        const daysOverdue = isOverdue ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;

        return {
          ...loan,
          toolName: tool?.name || "Unknown Tool",
          toolCategory: tool?.category || "General",
          isOverdue,
          daysOverdue,
        };
      })
    );
  },
});

// Admin Query: List all neighborhood users
export const listAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const auth = await requireAuthUser(ctx);
    if (!auth.user || auth.user.role !== "admin") {
      throw new Error("Forbidden: Admin privileges required.");
    }

    return await ctx.db.query("users").order("desc").collect();
  },
});

// Admin Query: View audit logs
export const listAuditLogs = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const auth = await requireAuthUser(ctx);
    if (!auth.user || auth.user.role !== "admin") {
      throw new Error("Forbidden: Admin privileges required.");
    }

    const limit = args.limit || 50;
    return await ctx.db.query("auditLogs").order("desc").take(limit);
  },
});

// Query used by HTTP endpoint (/api/overdue-loans) and Admin Panel
export const getOverdueLoansInternal = query({
  args: {},
  handler: async (ctx) => {
    const loans = await ctx.db
      .query("borrowRequests")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();

    const now = new Date();
    const overdueLoans = [];

    for (const loan of loans) {
      const end = new Date(loan.endDate);
      end.setHours(23, 59, 59, 999);

      if (end < now) {
        const diffDays = Math.ceil((now.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
        const tool = await ctx.db.get(loan.toolId);

        overdueLoans.push({
          loanId: loan._id,
          toolId: loan.toolId,
          toolName: tool?.name || "Unknown Tool",
          toolCategory: tool?.category || "General",
          borrowerName: loan.borrowerName,
          borrowerEmail: loan.borrowerEmail,
          ownerName: loan.ownerName,
          startDate: loan.startDate,
          endDate: loan.endDate,
          daysOverdue: diffDays,
          lastRemindedAt: loan.lastRemindedAt,
          reminderCount: loan.reminderCount || 0,
        });
      }
    }

    return overdueLoans;
  },
});

// Mutation used by HTTP endpoint (/api/overdue-reminders/record) for Idempotent write-back
export const recordOverdueReminderInternal = mutation({
  args: {
    loanId: v.id("borrowRequests"),
    idempotencyKey: v.string(),
    channel: v.string(),
    sentAt: v.number(),
  },
  handler: async (ctx, args) => {
    // 1. Idempotency Check
    const existingReminder = await ctx.db
      .query("remindersLog")
      .withIndex("by_idempotency_key", (q) => q.eq("idempotencyKey", args.idempotencyKey))
      .first();

    if (existingReminder) {
      return {
        success: true,
        duplicate: true,
        message: "Reminder already recorded for this idempotency key.",
        reminderId: existingReminder._id,
      };
    }

    const loan = await ctx.db.get(args.loanId);
    if (!loan) throw new Error("Loan not found");

    // 2. Insert into remindersLog
    const reminderId = await ctx.db.insert("remindersLog", {
      idempotencyKey: args.idempotencyKey,
      borrowRequestId: args.loanId,
      sentAt: args.sentAt,
      channel: args.channel,
    });

    // 3. Update loan record
    const updatedCount = (loan.reminderCount || 0) + 1;
    await ctx.db.patch(args.loanId, {
      lastRemindedAt: args.sentAt,
      reminderCount: updatedCount,
    });

    // 4. Audit Log
    await ctx.db.insert("auditLogs", {
      action: "OVERDUE_REMINDER_SENT",
      actorClerkId: "system:n8n",
      targetId: args.loanId,
      details: `Sent overdue reminder #${updatedCount} to ${loan.borrowerEmail} for loan ${args.loanId}`,
      timestamp: args.sentAt,
    });

    return {
      success: true,
      duplicate: false,
      reminderId,
      reminderCount: updatedCount,
    };
  },
});
