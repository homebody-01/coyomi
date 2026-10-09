import { format, parseISO, startOfDay, isToday } from 'date-fns';
import { useMemo } from 'react';
import { View } from 'react-native';

import { DayCell, type DayCellEventEntry } from './DayCell';
import { shouldShowNoteDot } from '../domain/dailyNote';
import { getHolidayName } from '../domain/holidays';
import type { PredictedRange } from '../domain/prediction';
import { occurrencesInRange } from '../domain/recurrence';
import { getRibbonDayStates, NONE_RIBBON_STATE } from '../domain/ribbon';
import { useTokens } from '../theme/tokens';
import type { Category, CycleRecord, DailyNote, Event, Settings } from '../types/models';

interface DayCellData {
  spanLanes: (DayCellEventEntry | null)[];
  events: DayCellEventEntry[];
}

const EMPTY_DAY_DATA: DayCellData = { spanLanes: [], events: [] };

interface WeekRowProps {
  week: Date[]; // 7 consecutive dates — may span a month boundary
  events: Event[];
  categories: Category[];
  cycleRecords: CycleRecord[];
  predictedRanges: PredictedRange[];
  notes: DailyNote[];
  settings: Pick<Settings, 'showWeekendColor' | 'weekendColorMode' | 'showHolidays'>;
  onDayPress: (date: Date) => void;
}

// One row of the continuously-scrolling calendar. All the per-week
// computation that used to live inside MonthGrid's `for (const week of
// weeks)` loop lives here now, just operating on the single week this
// component owns instead of iterating a whole month's worth of them —
// span-lane packing, the ribbon, notes, and holidays were already
// week-scoped, so passing a lone week through unchanged behavior.
export function WeekRow({
  week,
  events,
  categories,
  cycleRecords,
  predictedRanges,
  notes,
  settings,
  onDayPress,
}: WeekRowProps) {
  const tokens = useTokens();

  const dataByDay = useMemo(() => {
    const map = new Map<string, DayCellData>();
    const weekStart = week[0];
    const weekEnd = week[6];
    const weekInfos = events
      .map((event) => {
        const occ = occurrencesInRange(event, { start: weekStart, end: weekEnd });
        if (occ.length === 0) return null;
        const startKey = format(startOfDay(parseISO(event.startAt)), 'yyyy-MM-dd');
        const endKey = format(startOfDay(parseISO(event.endAt)), 'yyyy-MM-dd');
        const isSpan = event.isAllDay && !event.recurrenceRule && startKey !== endKey && occ.length >= 2;
        return {
          event,
          occursOn: new Set(occ.map((d) => format(d, 'yyyy-MM-dd'))),
          isSpan,
          startKey,
          endKey,
        };
      })
      .filter((info): info is NonNullable<typeof info> => info !== null);

    // Greedy interval-graph coloring (the classic "meeting rooms" packing):
    // sort by start date, then give each span the lowest lane whose last
    // occupant already ended before this one starts, reusing that lane
    // rather than always handing out a fresh one.
    const spanInfosSorted = weekInfos.filter((info) => info.isSpan).sort((a, b) => a.startKey.localeCompare(b.startKey));
    const laneEndDates: string[] = [];
    const spanAssignments: { info: (typeof spanInfosSorted)[number]; lane: number }[] = [];
    for (const info of spanInfosSorted) {
      let lane = laneEndDates.findIndex((endKey) => endKey < info.startKey);
      if (lane === -1) lane = laneEndDates.length;
      laneEndDates[lane] = info.endKey;
      spanAssignments.push({ info, lane });
    }
    const maxLanes = tokens.layout.dayCell.maxVisibleEvents;
    const visibleAssignments = spanAssignments.filter((a) => a.lane < maxLanes);
    const laneCount = Math.min(laneEndDates.length, maxLanes);

    const regularInfos = weekInfos.filter((info) => !info.isSpan);

    for (const date of week) {
      const key = format(date, 'yyyy-MM-dd');
      const spanLanes: (DayCellEventEntry | null)[] = Array.from({ length: laneCount }, (_, laneIndex) => {
        const assignment = visibleAssignments.find((a) => a.lane === laneIndex && a.info.occursOn.has(key));
        if (!assignment) return null;
        const { info } = assignment;
        // `occursOn` was computed against this week's own start/end, so its
        // size is already exactly "how many days does this span cover within
        // this row" — capped at the week boundary the same way the visible
        // connecting box itself is.
        return {
          event: info.event,
          roundedStart: key === info.startKey,
          roundedEnd: key === info.endKey,
          spanDayCount: info.occursOn.size,
        };
      });
      const regularEvents: DayCellEventEntry[] = regularInfos
        .filter((info) => info.occursOn.has(key))
        .map((info) => ({ event: info.event, roundedStart: true, roundedEnd: true }));
      map.set(key, { spanLanes, events: regularEvents });
    }
    return map;
  }, [events, week, tokens.layout.dayCell.maxVisibleEvents]);

  const ribbonByDay = useMemo(
    () => getRibbonDayStates(week, cycleRecords, predictedRanges),
    [week, cycleRecords, predictedRanges],
  );

  const noteByDay = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const date of week) {
      const key = format(date, 'yyyy-MM-dd');
      map.set(key, shouldShowNoteDot(key, notes));
    }
    return map;
  }, [week, notes]);

  const holidayByDay = useMemo(() => {
    const map = new Map<string, string | null>();
    if (!settings.showHolidays) return map;
    for (const date of week) {
      const key = format(date, 'yyyy-MM-dd');
      map.set(key, getHolidayName(key));
    }
    return map;
  }, [week, settings.showHolidays]);

  return (
    <View style={{ flexDirection: 'row' }}>
      {week.map((date) => {
        const key = format(date, 'yyyy-MM-dd');
        const dayData = dataByDay.get(key) ?? EMPTY_DAY_DATA;
        return (
          <DayCell
            key={date.toISOString()}
            date={date}
            isToday={isToday(date)}
            spanLanes={dayData.spanLanes}
            events={dayData.events}
            categories={categories}
            ribbonState={ribbonByDay.get(key) ?? NONE_RIBBON_STATE}
            hasNote={noteByDay.get(key) ?? false}
            holidayName={holidayByDay.get(key) ?? null}
            showWeekendColor={settings.showWeekendColor}
            weekendColorMode={settings.weekendColorMode}
            onPress={onDayPress}
          />
        );
      })}
    </View>
  );
}
