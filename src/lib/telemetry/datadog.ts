/**
 * Production-Grade Datadog APM, RUM & Custom Metrics Instrumentation
 * Formats metrics and breadcrumbs in compliance with Datadog's Agent & API Schemas
 */

export interface MetricTags {
  [key: string]: string | number | boolean | undefined;
}

export interface DatadogMetricPayload {
  metric: string;
  points: [[number, number]]; // [timestamp, value]
  type: "count" | "gauge" | "rate";
  tags: string[];
  host?: string;
}

// In-memory buffer for client metric aggregation
const clientMetricsBuffer: Array<{
  name: string;
  value: number;
  tags: Record<string, string>;
  timestamp: number;
}> = [];

/**
 * Format key-value object into Datadog standard tag array: ["service:lendloop", "env:production", "role:admin"]
 */
export function formatDatadogTags(tags: MetricTags = {}): string[] {
  const baseTags: Record<string, string> = {
    service: "lendloop",
    env: process.env.NODE_ENV || "development",
    version: "1.0.0",
  };

  const merged = { ...baseTags, ...tags };
  return Object.entries(merged)
    .filter(([_, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}:${String(v).toLowerCase()}`);
}

/**
 * Record a metric counter or gauge
 * e.g. recordMetric("rbac.auth.check", 1, { role: "admin", granted: "true" })
 */
export function recordMetric(
  metricName: string,
  value: number = 1,
  tags: MetricTags = {}
) {
  const timestamp = Date.now();
  const stringTags: Record<string, string> = {};
  for (const [k, v] of Object.entries(tags)) {
    if (v !== undefined) stringTags[k] = String(v);
  }

  clientMetricsBuffer.push({
    name: metricName,
    value,
    tags: stringTags,
    timestamp,
  });

  if (clientMetricsBuffer.length > 100) clientMetricsBuffer.shift();

  // If in browser and Datadog RUM is loaded
  if (typeof window !== "undefined" && (window as any).DD_RUM) {
    (window as any).DD_RUM.addAction(metricName, {
      value,
      ...stringTags,
    });
  }

  // Developer logging in non-production
  if (process.env.NODE_ENV !== "production") {
    console.debug(`[DATADOG METRIC] ${metricName}: ${value}`, formatDatadogTags(tags));
  }
}

/**
 * Performance measurement wrapper: Measures elapsed execution time and emits Datadog latency gauge
 */
export async function measurePerformance<T>(
  spanName: string,
  fn: () => Promise<T>,
  tags: MetricTags = {}
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const durationMs = Math.round(performance.now() - start);
    recordMetric(`perf.${spanName}.duration_ms`, durationMs, { ...tags, status: "success" });
    return result;
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - start);
    recordMetric(`perf.${spanName}.duration_ms`, durationMs, { ...tags, status: "error" });
    throw err;
  }
}

/**
 * Track user interaction for Datadog Real User Monitoring (RUM)
 */
export function trackRumAction(actionName: string, attributes: Record<string, any> = {}) {
  if (typeof window !== "undefined" && (window as any).DD_RUM) {
    (window as any).DD_RUM.addAction(actionName, attributes);
  } else {
    console.debug(`[DATADOG RUM ACTION] ${actionName}`, attributes);
  }
}
