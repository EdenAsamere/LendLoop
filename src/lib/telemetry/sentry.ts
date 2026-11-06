/**
 * Production-Ready Sentry Error Monitoring & Performance Tracing Wrapper
 * Designed with Privacy, Data Minimization & PII Scrubbing
 */

export interface SentryContext {
  userId?: string;
  role?: string;
  tags?: Record<string, string>;
  extra?: Record<string, any>;
}

// In-memory breadcrumb buffer for client diagnostics
const breadcrumbs: Array<{
  timestamp: string;
  category: string;
  message: string;
  level: "info" | "warning" | "error";
  data?: any;
}> = [];

/**
 * PII Scrubber: Strips bearer tokens, passwords, and sensitive keys from telemetry payloads
 */
function scrubPII(data: any): any {
  if (!data || typeof data !== "object") return data;
  const sensitiveKeys = ["authorization", "password", "token", "secret", "cookie", "api_key", "apiKey"];
  
  if (Array.isArray(data)) {
    return data.map(scrubPII);
  }

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      cleaned[key] = "[REDACTED_SENSITIVE]";
    } else if (typeof value === "object") {
      cleaned[key] = scrubPII(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export function addBreadcrumb(
  category: string,
  message: string,
  level: "info" | "warning" | "error" = "info",
  data?: Record<string, any>
) {
  const crumb = {
    timestamp: new Date().toISOString(),
    category,
    message,
    level,
    data: data ? scrubPII(data) : undefined,
  };

  breadcrumbs.push(crumb);
  if (breadcrumbs.length > 50) breadcrumbs.shift();

  // If running in browser and Sentry global exists (e.g. @sentry/nextjs)
  if (typeof window !== "undefined" && (window as any).Sentry) {
    (window as any).Sentry.addBreadcrumb(crumb);
  }
}

export function captureException(error: unknown, context?: SentryContext) {
  const errObj = error instanceof Error ? error : new Error(String(error));
  const safeContext = context ? scrubPII(context) : {};

  // Log to standard error stream with Sentry correlation tags
  console.error(`[SENTRY ERROR CAPTURE] ${errObj.name}: ${errObj.message}`, {
    stack: errObj.stack,
    context: safeContext,
    recentBreadcrumbs: breadcrumbs.slice(-5),
  });

  if (typeof window !== "undefined" && (window as any).Sentry) {
    (window as any).Sentry.captureException(errObj, {
      user: safeContext.userId ? { id: safeContext.userId, role: safeContext.role } : undefined,
      tags: safeContext.tags,
      extra: safeContext.extra,
    });
  }

  return errObj;
}

export function captureMessage(message: string, level: "info" | "warning" | "error" = "info", context?: SentryContext) {
  const safeContext = context ? scrubPII(context) : {};
  console.log(`[SENTRY ${level.toUpperCase()}] ${message}`, safeContext);

  if (typeof window !== "undefined" && (window as any).Sentry) {
    (window as any).Sentry.captureMessage(message, level);
  }
}
