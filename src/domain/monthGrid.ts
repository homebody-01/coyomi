import { addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns';

/** A month's calendar grid as an array of 7-day weeks, including the leading/trailing days of adjacent months. */
export function getMonthWeeks(year: number, month: number, weekStartsOn: 0 | 1 | 6): Date[][] {
  const monthStart = startOfMonth(new Date(year, month, 1));
  const monthEnd = endOfMonth(monthStart);
  const gridStart = startOfWeek(monthStart, { weekStartsOn });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  return chunkIntoWeeks(days);
}

/**
 * A month-agnostic run of consecutive 7-day weeks centered on `anchor`'s own
 * week, for a continuously-scrolling calendar — unlike `getMonthWeeks`, a
 * week here is never reset or padded at a month boundary, so e.g. Sep 27-30
 * and Oct 1-3 land in the same row instead of Oct 1 starting a fresh one.
 */
export function buildContinuousWeeks(
  anchor: Date,
  weekStartsOn: 0 | 1 | 6,
  weeksBefore: number,
  weeksAfter: number,
): Date[][] {
  const anchorWeekStart = startOfWeek(anchor, { weekStartsOn });
  const weeks: Date[][] = [];
  for (let offset = -weeksBefore; offset <= weeksAfter; offset += 1) {
    const weekStart = addWeeks(anchorWeekStart, offset);
    const weekEnd = endOfWeek(weekStart, { weekStartsOn });
    weeks.push(eachDayOfInterval({ start: weekStart, end: weekEnd }));
  }
  return weeks;
}

function chunkIntoWeeks(days: Date[]): Date[][] {
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}
