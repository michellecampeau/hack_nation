import { format, formatDistance, formatRelative } from "date-fns";

export function formatDate(date: Date | string, formatStr: string = "PPP"): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, formatStr);
}

export function formatRelativeDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return formatRelative(dateObj, new Date());
}

export function formatTimeAgo(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return formatDistance(dateObj, new Date(), { addSuffix: true });
}

export function isValidDate(date: unknown): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}
