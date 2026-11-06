"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import crypto from "crypto";

export const dispatchWebhook = internalAction({
  args: {
    event: v.string(), // e.g., "REQUEST_CREATED", "REQUEST_APPROVED", "REQUEST_REJECTED", "REQUEST_RETURNED"
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    const webhookSecret = process.env.N8N_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.warn("[Webhook Dispatcher] N8N_WEBHOOK_SECRET not configured. Skipping webhook dispatch.");
      return { success: false, error: "Missing webhook secret" };
    }

    const timestamp = Date.now().toString();
    const bodyString = JSON.stringify({
      event: args.event,
      timestamp,
      data: args.payload,
    });

    // HMAC-SHA256 signature calculation over timestamp + body
    const signature = crypto
      .createHmac("sha256", webhookSecret)
      .update(`${timestamp}.${bodyString}`)
      .digest("hex");

    if (!webhookUrl) {
      console.warn("[Webhook Dispatcher] N8N_WEBHOOK_URL not configured. Simulating delivery.");
      return {
        success: true,
        simulated: true,
        event: args.event,
        signature: `sha256=${signature}`,
      };
    }

    // SSRF Mitigation (OWASP A10): Strictly validate webhook URL scheme
    try {
      const parsedUrl = new URL(webhookUrl);
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        console.error(`[Webhook Dispatcher] Invalid webhook scheme: ${parsedUrl.protocol}`);
        return { success: false, error: "Invalid webhook URL protocol" };
      }
    } catch {
      console.error("[Webhook Dispatcher] Malformed webhook URL.");
      return { success: false, error: "Malformed webhook URL" };
    }

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-LendLoop-Signature": `sha256=${signature}`,
          "X-LendLoop-Timestamp": timestamp,
          "User-Agent": "LendLoop-Convex-Webhook/1.0",
        },
        body: bodyString,
      });

      if (!response.ok) {
        console.error(`[Webhook Dispatcher] Failed with status ${response.status}: ${await response.text()}`);
        return { success: false, status: response.status };
      }

      const resData = await response.json().catch(() => ({}));
      console.log(`[Webhook Dispatcher] Successfully delivered to n8n:`, resData);
      return { success: true, response: resData };
    } catch (err: any) {
      console.error("[Webhook Dispatcher] Network error connecting to n8n:", err.message);
      // Non-blocking for the primary mutation flow
      return { success: false, error: err.message };
    }
  },
});

