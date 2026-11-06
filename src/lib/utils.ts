import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string | number | Date): string {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function isOverdue(endDate: string, status: string): boolean {
  if (status !== "approved") return false;
  const end = new Date(endDate);
  const now = new Date();
  // Set to end of day
  end.setHours(23, 59, 59, 999);
  return end < now;
}

export function getDaysOverdue(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  const diffTime = now.getTime() - end.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Extracts a clean, human-readable error message from Convex, Clerk, or standard JavaScript errors,
 * stripping internal stack traces, request IDs, and Convex internal wrappers.
 */
export function getCleanErrorMessage(err: unknown): string {
  if (!err) return "An unexpected error occurred.";

  // 1. If ConvexError with .data string or object
  if (err && typeof err === "object" && "data" in err) {
    const data = (err as any).data;
    if (typeof data === "string" && data.trim()) return data.trim();
    if (data && typeof data === "object" && "message" in data) {
      return String(data.message).trim();
    }
  }

  let message = typeof err === "string" ? err : (err as any).message || String(err);

  // 2. Extract after 'Uncaught Error:' before stack trace / newline / ' at '
  const uncaughtMatch = message.match(
    /Uncaught Error:\s*([\s\S]+?)(?:\s+at\s+handler|\s+at\s+async\s+handler|\r?\n\s*at\s+|\s+at\s+\.\.|\s+at\s+http|\s+at\s+Object|$)/i
  );
  if (uncaughtMatch && uncaughtMatch[1]) {
    const extracted = uncaughtMatch[1].replace(/\s+at\s+.*$/i, "").trim();
    if (extracted) return extracted;
  }

  const serverMatch = message.match(/Server Error:\s*([^\r\n]+)/i);
  if (serverMatch && serverMatch[1]) {
    const extracted = serverMatch[1].trim();
    if (extracted) return extracted;
  }

  // 3. Fallback: Strip internal Convex annotations, request IDs, and stack traces
  message = message.replace(/\[CONVEX[^\]]*\]/gi, "");
  message = message.replace(/\[Request ID:[^\]]*\]/gi, "");
  message = message.replace(/Server Error/gi, "");
  message = message.replace(/Uncaught Error:/gi, "");
  message = message.replace(/\s+at\s+[\s\S]*$/gi, "");
  message = message.replace(/Called by client/gi, "");
  message = message.trim();

  return message || "An unexpected error occurred.";
}


