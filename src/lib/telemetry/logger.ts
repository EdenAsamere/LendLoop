/**
 * Production-Grade Structured Logger for Next.js & Node.js
 * Formats logs according to Datadog Log Management standard JSON schema
 * Automatically synchronizes breadcrumbs and alerts to Sentry
 */

import { addBreadcrumb, captureException } from "./sentry";
import { recordMetric } from "./datadog";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  userId?: string;
  role?: string;
  component?: string;
  action?: string;
  durationMs?: number;
  [key: string]: any;
}

export interface DatadogLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  env: string;
  ddsource: string;
  ddtags: string;
  context?: LogContext;
}

class TelemetryLogger {
  private serviceName: string = "lendloop";
  private env: string = process.env.NODE_ENV || "development";

  private formatEntry(level: LogLevel, message: string, context?: LogContext): DatadogLogEntry {
    const role = context?.role ? `role:${context.role}` : undefined;
    const component = context?.component ? `component:${context.component}` : undefined;
    const extraTags = [role, component].filter(Boolean).join(",");

    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.serviceName,
      env: this.env,
      ddsource: typeof window === "undefined" ? "nodejs" : "browser",
      ddtags: `env:${this.env},version:1.0.0${extraTags ? `,${extraTags}` : ""}`,
      context,
    };
  }

  debug(message: string, context?: LogContext) {
    if (this.env !== "production") {
      const entry = this.formatEntry("debug", message, context);
      console.debug(`%c[DEBUG]%c ${message}`, "color: #94a3b8; font-weight: bold", "color: inherit", context || "");
    }
  }

  info(message: string, context?: LogContext) {
    const entry = this.formatEntry("info", message, context);
    addBreadcrumb("app", message, "info", context);

    if (typeof window === "undefined" || this.env === "production") {
      // JSON format for Datadog log drains / cloud streams
      console.log(JSON.stringify(entry));
    } else {
      console.info(`%c[INFO]%c ${message}`, "color: #3b82f6; font-weight: bold", "color: inherit", context || "");
    }
  }

  warn(message: string, context?: LogContext) {
    const entry = this.formatEntry("warn", message, context);
    addBreadcrumb("app", message, "warning", context);
    recordMetric("logs.warning_count", 1, { component: context?.component });

    if (typeof window === "undefined" || this.env === "production") {
      console.warn(JSON.stringify(entry));
    } else {
      console.warn(`%c[WARN]%c ${message}`, "color: #f59e0b; font-weight: bold", "color: inherit", context || "");
    }
  }

  error(message: string, error?: unknown, context?: LogContext) {
    const entry = this.formatEntry("error", message, {
      ...context,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    });

    addBreadcrumb("app", message, "error", context);
    recordMetric("logs.error_count", 1, { component: context?.component, action: context?.action });
    captureException(error || new Error(message), {
      userId: context?.userId,
      role: context?.role,
      extra: context,
    });

    if (typeof window === "undefined" || this.env === "production") {
      console.error(JSON.stringify(entry));
    } else {
      console.error(`%c[ERROR]%c ${message}`, "color: #ef4444; font-weight: bold", "color: inherit", error || "", context || "");
    }
  }
}

export const logger = new TelemetryLogger();
