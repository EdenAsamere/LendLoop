import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

const http = httpRouter();

// Helper to authenticate n8n HTTP requests with constant-time comparison (OWASP A02)
function verifyN8nAuth(request: Request): boolean {
  const authHeader = request.headers.get("Authorization");
  const expectedKey = process.env.N8N_API_KEY;
  if (!authHeader || !expectedKey) return false;

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) return false;

  // Constant-time byte-level comparison to mitigate timing attacks
  if (token.length !== expectedKey.length) return false;
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ expectedKey.charCodeAt(i);
  }
  return mismatch === 0;
}

// GET /api/overdue-loans
// Fetches overdue loans for n8n Overdue Reminders Workflow
http.route({
  path: "/api/overdue-loans",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    // 1. Security Check
    if (!verifyN8nAuth(request)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Fetch overdue loans
    const loans = await ctx.runQuery(api.admin.getOverdueLoansInternal, {});

    return new Response(JSON.stringify({ data: loans, count: loans.length }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// POST /api/overdue-reminders/record
// Idempotent write-back endpoint for n8n to log sent reminders
http.route({
  path: "/api/overdue-reminders/record",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // 1. Security Check
    if (!verifyN8nAuth(request)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body = await request.json();
      const { loanId, idempotencyKey, channel = "email", sentAt = Date.now() } = body;

      if (!loanId || !idempotencyKey) {
        return new Response(
          JSON.stringify({ error: "Missing loanId or idempotencyKey" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // 2. Idempotent Write-Back execution
      const result = await ctx.runMutation(api.admin.recordOverdueReminderInternal, {
        loanId,
        idempotencyKey,
        channel,
        sentAt,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;

