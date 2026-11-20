import type { IsoDate, IsoTimestamp } from '../types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Parses `YYYY-MM-DD` as a local calendar day (no timezone shift). */
function parseIsoDate(value: IsoDate): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
function diffInDays(to: Date, from: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_PER_DAY);
}

export function toIsoDate(date: Date): IsoDate {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export type DueTone = 'normal' | 'overdue' | 'done';

export interface DueInfo {
  text: string;
  tone: DueTone;
}

/** An issue is overdue when it has a due date in the past and is not completed. */
export function isOverdue(
  issue: { dueDate: IsoDate | null; completedAt: IsoTimestamp | null },
  now: Date = new Date(),
): boolean {
  if (issue.completedAt || !issue.dueDate) return false;
  return diffInDays(parseIsoDate(issue.dueDate), now) < 0;
}

/**
 * Label shown in the due date slot of cards and rows. A completed issue shows
 * when it was completed instead of its due date. Returns null when there is nothing to show.
 */
export function getDueInfo(
  issue: { dueDate: IsoDate | null; completedAt: IsoTimestamp | null },
  now: Date = new Date(),
): DueInfo | null {
  if (issue.completedAt) {
    const days = diffInDays(now, new Date(issue.completedAt));
    if (days <= 0) return { text: 'Done today', tone: 'done' };
    if (days === 1) return { text: 'Done 1 day ago', tone: 'done' };
    return { text: `Done ${days} days ago`, tone: 'done' };
  }
  if (!issue.dueDate) return null;
  const days = diffInDays(parseIsoDate(issue.dueDate), now);
  if (days < 0) return { text: `Overdue ${-days} d`, tone: 'overdue' };
  if (days === 0) return { text: 'Today', tone: 'normal' };
  if (days === 1) return { text: 'Tomorrow', tone: 'normal' };
  return { text: `In ${days} days`, tone: 'normal' };
}

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

/** "Just now", "12 min ago", "1 h ago", "Yesterday", "3 days ago", "2 weeks ago"; `Never` when there is no time. */
export function formatLastActive(value: IsoTimestamp | null, now: Date = new Date()): string {
  if (!value) return 'Never';
  const elapsed = Math.max(0, now.getTime() - Date.parse(value));
  if (elapsed < 2 * MINUTE_MS) return 'Just now';
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)} min ago`;
  if (elapsed < 24 * HOUR_MS) return `${Math.floor(elapsed / HOUR_MS)} h ago`;
  const days = diffInDays(now, new Date(value));
  if (days <= 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  }
  const months = Math.floor(days / 30);
  return `${months} ${months === 1 ? 'month' : 'months'} ago`;
}

/** "12 Mar", or "12 Mar 2025" when it is not this year. */
export function formatShortDate(value: IsoTimestamp, now: Date = new Date()): string {
  const date = new Date(value);
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
}

function pluralize(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? '' : 's'}`;
}

/** "Just now", "5 minutes ago", "1 hour ago", "3 days ago"; older than 30 days: "2 Nov 2026". */
export function formatTimeAgo(value: IsoTimestamp, now: Date = new Date()): string {
  const elapsed = Math.max(0, now.getTime() - Date.parse(value));
  if (elapsed < MINUTE_MS) return 'Just now';
  if (elapsed < HOUR_MS) return `${pluralize(Math.floor(elapsed / MINUTE_MS), 'minute')} ago`;
  if (elapsed < 24 * HOUR_MS) return `${pluralize(Math.floor(elapsed / HOUR_MS), 'hour')} ago`;
  if (elapsed < 30 * 24 * HOUR_MS) return `${pluralize(Math.floor(elapsed / (24 * HOUR_MS)), 'day')} ago`;
  return formatLongDate(value);
}

/** "2 Nov 2026". */
export function formatLongDate(value: IsoTimestamp): string {
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Activity time: recent events as "5 minutes ago", older ones with the clock: "2 Nov 2026, 09:14". */
export function formatActivityTime(value: IsoTimestamp, now: Date = new Date()): string {
  if (now.getTime() - Date.parse(value) < 24 * HOUR_MS) return formatTimeAgo(value, now);
  const time = new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${formatLongDate(value)}, ${time}`;
}
