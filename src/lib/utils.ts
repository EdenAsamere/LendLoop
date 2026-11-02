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

