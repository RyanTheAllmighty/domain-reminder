import type { CheckTime } from "./config";

const DAY_MS = 24 * 60 * 60 * 1000;

export function nextRunAfter(now: Date, checkTime: CheckTime): Date {
  const next = new Date(now);
  next.setHours(checkTime.hour, checkTime.minute, 0, 0);

  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

export function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatLocalDateTime(date: Date): string {
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function daysUntilDate(expiryDate: Date, now: Date): number {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  return Math.floor((expiry.getTime() - today.getTime()) / DAY_MS);
}

export function formatDaysRemaining(days: number): string {
  if (days < 0) return `expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
  if (days === 0) return "expires today";
  if (days === 1) return "expires tomorrow";
  return `expires in ${days} days`;
}
