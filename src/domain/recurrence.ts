import { eachDayOfInterval, format, getDate, getDay, getMonth, parseISO, startOfDay } from 'date-fns';

import type { Event } from '../types/models';

export interface DateRange {
  start: Date; // startOfDay-aligned, inclusive
  end: Date; // startOfDay-aligned, inclusive
}

/**
 * Days within `range` on which `event` occurs. Recurring events
 * (daily/weekly/monthly/yearly, interval always 1 — the form never sets a
 * custom interval) are expanded by testing each day in `range` against a
 * per-frequency predicate rather than stepping forward from `startAt`, so a
 * month/year far in the future costs the same as one nearby, and a
 * nonexistent day (e.g. monthly on the 31st, viewed in a 30-day month)
 * simply never matches instead of needing special-case handling.
 * Non-recurring events occur on every day from startAt's date through
 * endAt's date (multi-day span).
 */
export function occurrencesInRange(event: Event, range: DateRange): Date[] {
  const startDay = startOfDay(parseISO(event.startAt));
  const rangeDays = eachDayOfInterval({ start: range.start, end: range.end });

  if (!event.recurrenceRule) {
    const endDay = startOfDay(parseISO(event.endAt));
    return rangeDays.filter((d) => d >= startDay && d <= endDay);
  }

  const excludedDates = new Set(event.excludedDates);
  const { freq } = event.recurrenceRule;
  return rangeDays.filter((d) => {
    if (d < startDay) return false;
    if (excludedDates.has(format(d, 'yyyy-MM-dd'))) return false;
    switch (freq) {
      case 'daily':
        return true;
      case 'weekly':
        return getDay(d) === getDay(startDay);
      case 'monthly':
        return getDate(d) === getDate(startDay);
      case 'yearly':
        return getDate(d) === getDate(startDay) && getMonth(d) === getMonth(startDay);
      default:
        return false;
    }
  });
}

/** All-day events first, then by start time — matches the day detail mockup's ordering. */
export function sortDayEvents(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    if (a.isAllDay !== b.isAllDay) return a.isAllDay ? -1 : 1;
    return a.startAt.localeCompare(b.startAt);
  });
}
