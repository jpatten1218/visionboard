import "server-only";

import { cookies } from "next/headers";

export const TIMEZONE_COOKIE = "vb_tz";

/**
 * Vercel runs in UTC, so a naive `new Date()` would roll the board over to a
 * new day in the late afternoon for anyone in the Americas. The browser writes
 * its IANA zone to a cookie on first load and every "today" is resolved
 * against that instead.
 */
export async function getTimezone(): Promise<string> {
  const raw = (await cookies()).get(TIMEZONE_COOKIE)?.value;
  return isValidTimezone(raw) ? raw : "UTC";
}

export function isValidTimezone(tz: string | undefined): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Today's calendar date in the given zone, as `YYYY-MM-DD`. */
export function todayIn(timeZone: string, now = new Date()): string {
  // en-CA formats as YYYY-MM-DD, which is exactly Postgres' date literal.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** The Monday on or before the given `YYYY-MM-DD`, as `YYYY-MM-DD`. */
export function weekStartOf(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  // getUTCDay: 0 = Sunday. Shift so Monday is the first day of the week.
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

/** The Sunday closing the week that contains `isoDate`. */
export function weekEndOf(isoDate: string): string {
  const date = new Date(`${weekStartOf(isoDate)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 6);
  return date.toISOString().slice(0, 10);
}

/** The day after `isoDate`, so ranges can butt up without overlapping. */
export function nextDay(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/** The last day of the month containing `isoDate`. */
export function monthEndOf(isoDate: string): string {
  const [year, month] = isoDate.split("-").map(Number);
  // Day 0 of the next month is the last day of this one.
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

/** The last day of the calendar quarter containing `isoDate`. */
export function quarterEndOf(isoDate: string): string {
  const [year, month] = isoDate.split("-").map(Number);
  const quarterEndMonth = Math.ceil(month / 3) * 3;
  return new Date(Date.UTC(year, quarterEndMonth, 0)).toISOString().slice(0, 10);
}

/** `count` days back from `isoDate`, oldest first, inclusive of `isoDate`. */
export function recentDays(isoDate: string, count: number): string[] {
  const days: string[] = [];
  const date = new Date(`${isoDate}T00:00:00Z`);
  for (let i = count - 1; i >= 0; i--) {
    const day = new Date(date);
    day.setUTCDate(day.getUTCDate() - i);
    days.push(day.toISOString().slice(0, 10));
  }
  return days;
}

export function formatDay(isoDate: string): string {
  // The string is already a calendar date in the user's zone, so it is read
  // back at UTC noon to keep the formatter from shifting it a day either way.
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${isoDate}T12:00:00Z`));
}
