import { differenceInCalendarDays } from 'date-fns';

import type { CycleRecord, Settings } from '../types/models';
import { addPlainDays, diffPlainDaysInclusive, parsePlainDate, todayPlainDate } from './plainDate';

export interface PredictedRange {
  startDate: string; // 'yyyy-MM-dd'
  endDate: string; // 'yyyy-MM-dd', inclusive
}

const MIN_FINISHED_FOR_CYCLE_AVERAGE = 2;
const RECENT_FINISHED_WINDOW = 3;

/**
 * Predicts upcoming cycle ranges from past records. Pure function — the
 * `showForecast` toggle is applied by the caller, not here.
 */
export function predictNextCycles(
  records: CycleRecord[],
  settings: Pick<Settings, 'cycleLengthDays' | 'periodLengthDays'>,
  horizonDays = 365, // keep predicting cycles until coverage reaches this far past today
): PredictedRange[] {
  if (records.length === 0) return [];

  // Most recent record by startDate — finished OR still open. An in-progress
  // record is the best anchor for "when does the next cycle start", even
  // though its own length can't be averaged yet.
  const sortedDesc = [...records].sort((a, b) => b.startDate.localeCompare(a.startDate));
  const anchorStartDate = sortedDesc[0].startDate;

  const recentFinished = sortedDesc
    .filter((record) => record.endDate !== null)
    .slice(0, RECENT_FINISHED_WINDOW);

  // A single finished record already tells you its own actual period length
  // with no averaging needed, so 1 finished record is enough to prefer real
  // data over Settings here (only 0 finished records falls back).
  const avgPeriodLength =
    recentFinished.length > 0
      ? average(recentFinished.map((record) => diffPlainDaysInclusive(record.startDate, record.endDate as string)))
      : settings.periodLengthDays;

  // Cycle length needs an interval between two starts, so it needs >= 2
  // finished records; with fewer, there's no gap to measure yet.
  const avgCycleLength =
    recentFinished.length >= MIN_FINISHED_FOR_CYCLE_AVERAGE
      ? average(consecutiveStartDeltas(recentFinished.map((record) => record.startDate)))
      : settings.cycleLengthDays;

  // average([]) is NaN, and malformed/duplicate startDates can produce a
  // zero/negative delta — `> 0` catches both (NaN > 0 is false in JS).
  const safeCycleLength = avgCycleLength > 0 ? Math.round(avgCycleLength) : settings.cycleLengthDays;
  const safePeriodLength = avgPeriodLength > 0 ? Math.round(avgPeriodLength) : settings.periodLengthDays;

  // `safeCycleLength` is always positive (an averaged real gap, or Settings'
  // own cycleLengthDays, which the settings wheel constrains to 20-60), so
  // this always terminates.
  const horizonEnd = addPlainDays(todayPlainDate(), horizonDays);
  const ranges: PredictedRange[] = [];
  let nextStart = addPlainDays(anchorStartDate, safeCycleLength);
  while (nextStart <= horizonEnd) {
    const endDate = addPlainDays(nextStart, safePeriodLength - 1);
    ranges.push({ startDate: nextStart, endDate });
    nextStart = addPlainDays(nextStart, safeCycleLength);
  }
  return ranges;
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

// `datesMostRecentFirst` comes in newest-first order; reverse to compute
// forward-in-time gaps between starts, filtering non-positive deltas from
// malformed/out-of-order data.
function consecutiveStartDeltas(datesMostRecentFirst: string[]): number[] {
  const ascending = [...datesMostRecentFirst].reverse();
  const deltas: number[] = [];
  for (let i = 1; i < ascending.length; i += 1) {
    deltas.push(differenceInCalendarDays(parsePlainDate(ascending[i]), parsePlainDate(ascending[i - 1])));
  }
  return deltas.filter((delta) => delta > 0);
}
