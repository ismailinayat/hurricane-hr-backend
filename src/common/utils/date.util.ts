const DURATION_PATTERN = /^(\d+)\s*(s|m|h|d)$/i;
const UNIT_TO_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/** Parses simple durations like "15m", "1h", "30s", "2d" into milliseconds. */
export function parseDurationToMs(duration: string): number {
  const match = DURATION_PATTERN.exec(duration.trim());
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }
  const [, value, unit] = match;
  return parseInt(value, 10) * UNIT_TO_MS[unit.toLowerCase()];
}

/**
 * Formats a Date as a `YYYY-MM-DD` calendar-date string using the server's
 * local timezone. Must stay in the server's local calendar day (not UTC) so
 * that "today" here matches the frontend's `date-fns format(new Date(), ...)`,
 * which also resolves to the browser's local day — otherwise employees who
 * clock in near midnight get an attendanceDate one day off from what the
 * dashboard queries for "today", and show up as absent despite being present.
 */
export function toDateOnlyString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** `YYYY-MM-DD` for the calendar day `days` days before today (server-local). */
export function daysAgoDateOnlyString(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toDateOnlyString(date);
}

/** Inclusive count of calendar days between two `YYYY-MM-DD` dates. */
export function inclusiveDayCount(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
}

export function isDateRangeValid(startDate: string, endDate: string): boolean {
  return new Date(startDate).getTime() <= new Date(endDate).getTime();
}

export function dateRangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return (
    new Date(aStart).getTime() <= new Date(bEnd).getTime() &&
    new Date(bStart).getTime() <= new Date(aEnd).getTime()
  );
}
