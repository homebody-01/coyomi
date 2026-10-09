import type { CycleRecord } from '../types/models';
import { addPlainDays, formatPlainDate, todayPlainDate } from './plainDate';
import type { PredictedRange } from './prediction';

export type RibbonKind = 'none' | 'actual' | 'predicted';

export interface RibbonDayState {
  kind: RibbonKind;
  roundedStart: boolean; // true iff this day is the literal first day of the underlying range
  roundedEnd: boolean; // true iff this day is the literal last day of the underlying range
}

export const NONE_RIBBON_STATE: RibbonDayState = { kind: 'none', roundedStart: false, roundedEnd: false };

/**
 * Per-day ribbon state for every day in `days` (typically a visible month
 * grid, ~42 days). Actual CycleRecords are filled first and always win over
 * predicted ranges on overlapping days (the `!result.has` guard below).
 */
export function getRibbonDayStates(
  days: Date[],
  cycleRecords: CycleRecord[],
  predictedRanges: PredictedRange[],
): Map<string, RibbonDayState> {
  if (days.length === 0) return new Map();

  const dayValues = days.map(formatPlainDate).sort();
  const rangeMin = dayValues[0];
  const rangeMax = dayValues[dayValues.length - 1];
  const dayKeys = new Set(dayValues);
  const result = new Map<string, RibbonDayState>();

  const fill = (startDate: string, endDate: string, kind: RibbonKind) => {
    if (endDate < rangeMin || startDate > rangeMax) return; // no overlap with this page at all
    const clampedStart = startDate < rangeMin ? rangeMin : startDate;
    const clampedEnd = endDate > rangeMax ? rangeMax : endDate;
    let cursor = clampedStart;
    while (cursor <= clampedEnd) {
      if (dayKeys.has(cursor) && !result.has(cursor)) {
        result.set(cursor, { kind, roundedStart: cursor === startDate, roundedEnd: cursor === endDate });
      }
      cursor = addPlainDays(cursor, 1);
    }
  };

  for (const record of cycleRecords) {
    // An open record (endDate === null) is only known through today — it
    // must never render as "actual" into the future on a calendar that
    // pages years ahead.
    const effectiveEnd = record.endDate ?? todayPlainDate();
    fill(record.startDate, effectiveEnd, 'actual');
  }
  for (const range of predictedRanges) {
    fill(range.startDate, range.endDate, 'predicted');
  }

  return result;
}
