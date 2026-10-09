import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { RibbonDayState } from '../domain/ribbon';
import { resolveWeekdayColor, useTokens, type Palette } from '../theme/tokens';
import type { Category, Event } from '../types/models';

// Matches styles.cell's paddingHorizontal below. The ribbon row cancels this
// padding (via negative margin) so adjacent days' ribbon segments meet
// exactly at the cell boundary and read as one continuous bar within a week,
// instead of each day's bar floating inset with a visible gap next to its
// neighbor's.
const CELL_HORIZONTAL_PADDING = 2;

// Exact value requested for the note indicator dot — not a design token,
// since it's the one place in the UI this specific gray is used.
const NOTE_DOT_COLOR = '#737373';

// A day cell is too narrow for numberOfLines={1}'s native "…" truncation to
// read cleanly, so titles are hard-capped to 4 characters with no ellipsis
// mark at all, per direct request.
const EVENT_TITLE_MAX_CHARS = 4;

function truncateEventTitle(title: string, maxChars: number = EVENT_TITLE_MAX_CHARS): string {
  return title.length > maxChars ? title.slice(0, maxChars) : title;
}

// Exact value requested for the alternating month background — not a design
// token, since it's the one place this specific shade is used.
const ALTERNATE_MONTH_BACKGROUND = '#f4f1ee';

// The REAL current month is always `paperColor`, full stop — not whichever
// month the calendar happens to be scrolled to. Every other month alternates
// from there, so the parity flips forward as real time advances into a new
// month (this month is paper, the one after is grey, the one after that is
// paper again — and after this month becomes next month, that recalculates
// relative to the new "now").
function monthBackgroundColor(date: Date, paperColor: string): string {
  const today = new Date();
  const diff = (date.getFullYear() - today.getFullYear()) * 12 + (date.getMonth() - today.getMonth());
  const isSameParityAsCurrentMonth = ((diff % 2) + 2) % 2 === 0;
  return isSameParityAsCurrentMonth ? paperColor : ALTERNATE_MONTH_BACKGROUND;
}

// `roundedStart`/`roundedEnd` mirror RibbonDayState's meaning: true iff this
// day is the literal first/last day of the event's overall span. A
// multi-day all-day event gets one entry per day it touches, each carrying
// its own flags so DayCell can bleed the box into neighboring cells on
// every side that isn't a true edge — the same technique the ribbon uses.
// Single-day events (timed or all-day) always get both flags true.
export interface DayCellEventEntry {
  event: Event;
  roundedStart: boolean;
  roundedEnd: boolean;
  // How many days, within the current week row, this span's connecting box
  // covers starting from its true start — only meaningful on the
  // `roundedStart` day, where it widens how much of the title can show
  // (4 chars per day it spans, e.g. 8 for a 2-day span).
  spanDayCount?: number;
}

interface DayCellProps {
  date: Date;
  isToday: boolean;
  // Multi-day all-day spans, one fixed lane per index — SAME length and
  // lane assignment on every day in a given week (entry is null on days
  // that lane's event doesn't touch). Rendered in its own row, always
  // immediately after the ribbon, for the same reason the ribbon itself
  // lives there: if this lived among the regular flexible event list, a
  // different number of regular events on one day vs. its neighbor would
  // push that day's copy of the connecting box down by a row, breaking the
  // line up with the rest of the span.
  spanLanes: (DayCellEventEntry | null)[];
  events: DayCellEventEntry[]; // everything else (timed, or single-day all-day)
  categories: Category[];
  ribbonState: RibbonDayState;
  hasNote: boolean;
  holidayName: string | null;
  showWeekendColor: boolean;
  weekendColorMode: 'redBlue' | 'shadeOnly';
  onPress: (date: Date) => void;
}

function allDayBoxStyle(roundedStart: boolean, roundedEnd: boolean, color: string) {
  return {
    backgroundColor: color,
    borderTopLeftRadius: roundedStart ? 3 : 0,
    borderBottomLeftRadius: roundedStart ? 3 : 0,
    borderTopRightRadius: roundedEnd ? 3 : 0,
    borderBottomRightRadius: roundedEnd ? 3 : 0,
  };
}

function SolidRibbon({ tokens, roundedStart, roundedEnd }: { tokens: Palette; roundedStart: boolean; roundedEnd: boolean }) {
  return (
    <View
      style={{
        height: tokens.stroke.ribbon,
        backgroundColor: tokens.color.terracotta,
        borderTopLeftRadius: roundedStart ? tokens.radius.ribbonEnd : 0,
        borderBottomLeftRadius: roundedStart ? tokens.radius.ribbonEnd : 0,
        borderTopRightRadius: roundedEnd ? tokens.radius.ribbonEnd : 0,
        borderBottomRightRadius: roundedEnd ? tokens.radius.ribbonEnd : 0,
      }}
    />
  );
}

// Short dashes with gaps, not `borderStyle: 'dashed'` — RN's native dashed
// borders combined with borderRadius (needed only at a segment's true
// start/end) render inconsistently across platforms. Plain Views are fully
// deterministic and need no new dependency.
//
// Each cell starts and ends with a HALF-width gap rather than a dash. This
// is what lets consecutive predicted days connect cleanly: two adjacent
// cells' half-gaps sum to exactly one full gap at the shared boundary, so
// the dash/gap rhythm continues unbroken across the whole predicted range
// instead of two dashes from neighboring cells visually fusing together
// (which is what a dash-first/dash-last pattern did — reported as dashes
// "sticking together" and the rhythm reading as uneven).
//
// Dash:gap uses a 16:9 flex ratio, with 6 dashes per cell — this combination
// is what makes a dash ≈2/3 and a gap ≈1/2 the size of the previous (4-dash,
// 4:3, no-half-gap) version, per direct request.
const DASH_COUNT = 6;
const DASH_FLEX = 16;
const GAP_FLEX = 9;
const DASHED_RIBBON_COLOR_SUFFIX = '99'; // ~60% alpha (0.6 * 255 ≈ 153 = 0x99)

function DashedRibbon({ tokens, roundedStart, roundedEnd }: { tokens: Palette; roundedStart: boolean; roundedEnd: boolean }) {
  const dashColor = `${tokens.color.terracotta}${DASHED_RIBBON_COLOR_SUFFIX}`;
  const children = [];
  children.push(<View key="edge-start" style={{ flex: GAP_FLEX / 2 }} />);
  for (let dashIndex = 0; dashIndex < DASH_COUNT; dashIndex += 1) {
    const isFirstDash = dashIndex === 0;
    const isLastDash = dashIndex === DASH_COUNT - 1;
    children.push(
      <View
        key={`dash-${dashIndex}`}
        style={{
          flex: DASH_FLEX,
          backgroundColor: dashColor,
          borderTopLeftRadius: isFirstDash && roundedStart ? tokens.radius.ribbonEnd : 0,
          borderBottomLeftRadius: isFirstDash && roundedStart ? tokens.radius.ribbonEnd : 0,
          borderTopRightRadius: isLastDash && roundedEnd ? tokens.radius.ribbonEnd : 0,
          borderBottomRightRadius: isLastDash && roundedEnd ? tokens.radius.ribbonEnd : 0,
        }}
      />,
    );
    children.push(<View key={`gap-${dashIndex}`} style={{ flex: isLastDash ? GAP_FLEX / 2 : GAP_FLEX }} />);
  }
  return <View style={{ flexDirection: 'row', height: tokens.stroke.ribbon }}>{children}</View>;
}

export function DayCell({
  date,
  isToday,
  spanLanes,
  events,
  categories,
  ribbonState,
  hasNote,
  holidayName,
  showWeekendColor,
  weekendColorMode,
  onPress,
}: DayCellProps) {
  const tokens = useTokens();
  const dow = date.getDay();
  const numberColor = isToday
    ? tokens.color.paper
    : resolveWeekdayColor(dow, tokens, showWeekendColor, weekendColorMode, holidayName !== null);

  // spanLanes is sized for the whole week (so a lane index stays consistent
  // across every day it touches), but most days in a week aren't touched by
  // every lane. Trim trailing lanes this SPECIFIC day has no entry for —
  // reserving their height here would just be blank space, since nothing on
  // this day needs to line up with them. Lanes before the last active one
  // still render (even if null) because a later lane's box on THIS day must
  // stay at the same row index as on the days where the earlier lane IS
  // active.
  const lastActiveSpanLaneIndex = spanLanes.reduce((last, entry, i) => (entry ? i : last), -1);
  const visibleSpanLanes = spanLanes.slice(0, lastActiveSpanLaneIndex + 1);

  // A span's title, widened past this cell's own width, needs to paint over
  // the following days' cells rather than get painted over by them — sibling
  // Views otherwise stack in tree order (later day = on top). Raising this
  // cell's own zIndex only changes paint order where it actually overlaps a
  // sibling, so it has no effect elsewhere in the cell.
  const hasOverflowingSpanLabel = visibleSpanLanes.some(
    (entry) => entry?.roundedStart && (entry.spanDayCount ?? 1) > 1,
  );

  // Span lanes eat into the same maxVisibleEvents budget the regular list
  // uses, so a day with an active span shows correspondingly fewer regular
  // events before overflowing — the total row count per cell stays capped.
  const singleBudget = Math.max(tokens.layout.dayCell.maxVisibleEvents - visibleSpanLanes.length, 0);
  const visible = events.slice(0, singleBudget);
  const overflow = events.length - visible.length;

  return (
    <Pressable
      onPress={() => onPress(date)}
      style={[
        styles.cell,
        { minHeight: tokens.layout.dayCell.minHeight, backgroundColor: monthBackgroundColor(date, tokens.color.paper) },
        hasOverflowingSpanLabel && { zIndex: 1 },
      ]}
    >
      <View style={[styles.dateRow, { height: tokens.layout.dayCell.dateRowHeight }]}>
        <View style={[styles.dateCircle, isToday && { backgroundColor: tokens.color.ink }]}>
          <Text style={{ color: numberColor, fontFamily: tokens.font.family, fontSize: 13 }}>
            {date.getDate()}
          </Text>
        </View>
        <View style={styles.noteDotSlot}>
          {hasNote && <View style={[styles.noteDot, { backgroundColor: NOTE_DOT_COLOR }]} />}
        </View>
      </View>

      {/* Always immediately after the date row, at a fixed height — the
          ribbon needs a stable, unconditional position so it never jumps
          between rows across neighboring cells. */}
      <View
        style={{
          height: tokens.layout.dayCell.ribbonRowHeight,
          justifyContent: 'center',
          marginHorizontal: -CELL_HORIZONTAL_PADDING,
        }}
      >
        {ribbonState.kind === 'actual' && (
          <SolidRibbon tokens={tokens} roundedStart={ribbonState.roundedStart} roundedEnd={ribbonState.roundedEnd} />
        )}
        {ribbonState.kind === 'predicted' && (
          <DashedRibbon tokens={tokens} roundedStart={ribbonState.roundedStart} roundedEnd={ribbonState.roundedEnd} />
        )}
      </View>

      {/* Fixed lanes for multi-day all-day spans — same lane index for a
          given span on every day it touches, so the connecting box never
          drifts to a different row because a neighboring day has a holiday
          or a different number of regular events. */}
      {visibleSpanLanes.map((entry, laneIndex) => {
        const spanDayCount = entry?.spanDayCount ?? 1;
        return (
          <View key={`span-lane-${laneIndex}`} style={{ height: tokens.layout.dayCell.eventRowHeight }}>
            {entry && (
              <View
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  marginLeft: entry.roundedStart ? 0 : -CELL_HORIZONTAL_PADDING,
                  marginRight: entry.roundedEnd ? 0 : -CELL_HORIZONTAL_PADDING,
                }}
              >
                <View
                  style={[
                    styles.allDayBox,
                    allDayBoxStyle(
                      entry.roundedStart,
                      entry.roundedEnd,
                      categories.find((c) => c.id === entry.event.categoryId)?.colorHex ?? tokens.color.ink,
                    ),
                  ]}
                >
                  {/* Continuation segments (roundedStart false) show no label
                      — the title reads once, at the span's true start.
                      Widened past this single day cell (percentage resolves
                      against allDayBox's own per-day width) so a longer span
                      can show more of its title — the connecting box already
                      visually covers those days, this just lets the text use
                      that space too. Nothing here clips, so it paints over
                      the following days' cells; see the raised zIndex below
                      for why that isn't itself painted over in turn. */}
                  {entry.roundedStart && (
                    <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${spanDayCount * 100}%`, justifyContent: 'center' }}>
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="clip"
                        style={{ color: tokens.color.paper, fontFamily: tokens.font.family, fontSize: 10, paddingHorizontal: 4 }}
                      >
                        {truncateEventTitle(entry.event.title, EVENT_TITLE_MAX_CHARS * spanDayCount)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        );
      })}

      <View>
        {visible.map(({ event }) => {
          const category = categories.find((c) => c.id === event.categoryId);
          const color = category?.colorHex ?? tokens.color.ink;
          if (event.isAllDay) {
            return (
              <View key={event.id} style={[styles.eventRow, { height: tokens.layout.dayCell.eventRowHeight }]}>
                <View style={[styles.allDayBox, allDayBoxStyle(true, true, color)]}>
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="clip"
                    style={{ color: tokens.color.paper, fontFamily: tokens.font.family, fontSize: 10 }}
                  >
                    {truncateEventTitle(event.title)}
                  </Text>
                </View>
              </View>
            );
          }
          return (
            <View
              key={event.id}
              style={[styles.eventRow, { height: tokens.layout.dayCell.eventRowHeight }]}
            >
              <View style={[styles.eventDot, { backgroundColor: color }]} />
              <Text
                numberOfLines={1}
                ellipsizeMode="clip"
                style={{ color: tokens.color.ink, fontFamily: tokens.font.family, fontSize: 11 }}
              >
                {truncateEventTitle(event.title)}
              </Text>
            </View>
          );
        })}
        {overflow > 0 && (
          <Text style={{ color: tokens.color.ink, fontFamily: tokens.font.family, fontSize: 11, opacity: 0.6 }}>
            他{overflow}件
          </Text>
        )}
      </View>

      {/* Pinned to the true bottom edge of the cell (not just after the
          events, wherever that lands) via a flex-growing spacer — holidays
          don't need to line up with anything in neighboring cells (unlike
          the ribbon or a connecting span), so there's no reason to reserve
          space for them above the flexible content. */}
      {holidayName && (
        <>
          <View style={{ flex: 1 }} />
          <Text
            numberOfLines={1}
            style={{ color: tokens.color.ink, opacity: 0.6, fontFamily: tokens.font.family, fontSize: 9 }}
          >
            {holidayName}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1, paddingHorizontal: CELL_HORIZONTAL_PADDING, paddingVertical: 4 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dateCircle: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  noteDotSlot: { width: 6, height: 6 },
  noteDot: { width: 6, height: 6, borderRadius: 3 },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  eventDot: { width: 5, height: 5, borderRadius: 2.5 },
  allDayBox: {
    flex: 1,
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
});
