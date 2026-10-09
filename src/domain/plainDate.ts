import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';

// Centralizes arithmetic on the plain 'yyyy-MM-dd' date strings used by
// CycleRecord.startDate/endDate — a different representation from Event's
// full ISO8601 startAt/endAt. date-fns' parseISO treats a date-only string
// as local midnight (unlike native `new Date(dateString)`, which the spec
// defines as UTC midnight for date-only strings — a classic off-by-one-day
// bug near timezone boundaries). Never call `new Date(dateString)` or
// `.toISOString()` directly on a CycleRecord date; go through these instead.

export function parsePlainDate(value: string): Date {
  return parseISO(value);
}

export function formatPlainDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function todayPlainDate(): string {
  return formatPlainDate(new Date());
}

export function addPlainDays(value: string, amount: number): string {
  return formatPlainDate(addDays(parsePlainDate(value), amount));
}

export function diffPlainDaysInclusive(startValue: string, endValue: string): number {
  return differenceInCalendarDays(parsePlainDate(endValue), parsePlainDate(startValue)) + 1;
}
