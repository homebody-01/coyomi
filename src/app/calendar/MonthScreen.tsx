import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format, isSameMonth } from 'date-fns';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBannerAd } from '../../components/AppBannerAd';
import { DayDetailSheet } from '../../components/DayDetailSheet';
import { HeaderTextButton } from '../../components/HeaderTextButton';
import { MonthYearPickerSheet } from '../../components/MonthYearPickerSheet';
import { WeekdayHeader } from '../../components/WeekdayHeader';
import { WeekRow } from '../../components/WeekRow';
import { buildContinuousWeeks } from '../../domain/monthGrid';
import { predictNextCycles } from '../../domain/prediction';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useCycleRecordStore } from '../../store/useCycleRecordStore';
import { useDailyNoteStore } from '../../store/useDailyNoteStore';
import { useEventStore } from '../../store/useEventStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useTokens } from '../../theme/tokens';
import type { CalendarStackParamList } from '../../types/navigation';

// ~5 years before/after the anchor week (60 months × ~4.35 weeks/month) —
// bounded rather than truly infinite, since a personal calendar has no
// realistic need to scroll further, and a fixed range keeps the FlatList's
// index math simple.
const WEEK_RANGE = 260;

export default function MonthScreen() {
  const tokens = useTokens();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<CalendarStackParamList>>();
  const events = useEventStore((state) => state.events);
  const categories = useCategoryStore((state) => state.categories);
  const cycleRecords = useCycleRecordStore((state) => state.cycleRecords);
  const notes = useDailyNoteStore((state) => state.notes);
  const settings = useSettingsStore((state) => state.settings);
  const weekStartsOn = settings.weekStartsOn;

  const predictedRanges = useMemo(
    () => (settings.showForecast ? predictNextCycles(cycleRecords, settings) : []),
    [cycleRecords, settings],
  );

  const weeks = useMemo(
    () => buildContinuousWeeks(new Date(), weekStartsOn, WEEK_RANGE, WEEK_RANGE),
    [weekStartsOn],
  );

  // Every row is exactly one week now (no more month-shaped items of
  // varying week count), so — unlike the old per-month estimate — this is
  // an exact height, not a guess.
  const weekRowHeight = tokens.layout.dayCell.minHeight;
  const getItemLayout = useCallback(
    (_: ArrayLike<Date[]> | null | undefined, index: number) => ({
      length: weekRowHeight,
      offset: weekRowHeight * index,
      index,
    }),
    [weekRowHeight],
  );

  // Every row where a month begins (there's never more than one "day 1" in
  // a 7-day span), in ascending row order — the single source of truth for
  // both jumping to "today's month" and for deciding when the header should
  // flip over to a new month while scrolling.
  const monthStartMarkers = useMemo(() => {
    const markers: { rowIndex: number; date: Date }[] = [];
    weeks.forEach((week, rowIndex) => {
      const firstOfMonth = week.find((d) => d.getDate() === 1);
      if (firstOfMonth) markers.push({ rowIndex, date: firstOfMonth });
    });
    return markers;
  }, [weeks]);

  const [headerDate, setHeaderDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const listRef = useRef<FlatList<Date[]>>(null);
  // `initialScrollIndex` and `scrollToIndex` (今月 button, year/month picker)
  // both fire onScroll as they move the list, even though neither is the
  // user scrolling. Reacting to those would let the 10%-threshold logic
  // below fire on the very first frame — e.g. today's week (placed at the
  // top on launch) can itself contain next month's 1st when today falls in
  // a month's last week, which would flip the header to next month before
  // the user ever touched the screen. Only true finger-drag scrolling
  // (onScrollBeginDrag) should drive the threshold logic; those other paths
  // already set headerDate explicitly themselves.
  const hasUserScrolledRef = useRef(false);

  const scrollToMonth = useCallback(
    (year: number, month: number) => {
      const marker = monthStartMarkers.find((m) => m.date.getFullYear() === year && m.date.getMonth() === month);
      if (!marker) return;
      listRef.current?.scrollToIndex({ index: marker.rowIndex, animated: true, viewPosition: 0 });
      setHeaderDate(marker.date);
    },
    [monthStartMarkers],
  );

  const scrollToCurrentMonth = useCallback(() => {
    const today = new Date();
    scrollToMonth(today.getFullYear(), today.getMonth());
  }, [scrollToMonth]);

  // Bounds for the year wheel — matches the actual navigable range (the
  // first/last month markers the continuous week list can reach), not an
  // arbitrary guess.
  const minYear = monthStartMarkers[0]?.date.getFullYear() ?? headerDate.getFullYear();
  const maxYear = monthStartMarkers[monthStartMarkers.length - 1]?.date.getFullYear() ?? headerDate.getFullYear();

  // The header only flips to a new month once that month's "day 1" row has
  // scrolled up into the top 10% of the screen — not the instant it first
  // becomes the topmost row — since a transition week (e.g. Sep 27-Oct 3)
  // can make the new month "technically visible" while the screen is still
  // showing mostly the old one.
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!hasUserScrolledRef.current) return;
    const scrollY = event.nativeEvent.contentOffset.y;
    const threshold = event.nativeEvent.layoutMeasurement.height * 0.1;
    let candidate: Date | null = null;
    for (const marker of monthStartMarkers) {
      const rowScreenY = marker.rowIndex * weekRowHeight - scrollY;
      if (rowScreenY > threshold) break; // markers are rowIndex-ascending, so every later one only scores higher
      candidate = marker.date;
    }
    if (!candidate) return;
    setHeaderDate((prev) => (isSameMonth(prev, candidate) ? prev : candidate));
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.paper }}>
      {/* Custom in-content header, not the native stack header — iOS's
          system nav bar auto-wraps custom headerRight views in its own
          "glass" pill background on recent OS versions, which showed up as
          a second, larger pill nesting behind our own 記録 pill. Rendering
          the header as plain app content sidesteps that OS chrome entirely
          and gives full control over left-alignment. */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.headerTitle} onPress={() => setIsMonthPickerOpen(true)}>
          <Text style={{ fontFamily: tokens.font.family, fontSize: 22, fontWeight: '700', color: tokens.color.ink }}>
            {format(headerDate, 'M月')}
          </Text>
          <Text style={{ fontFamily: tokens.font.family, fontSize: 14, color: tokens.color.ink, opacity: 0.5 }}>
            {headerDate.getFullYear()}
          </Text>
        </Pressable>
        <View style={styles.headerRight}>
          <HeaderTextButton label="今月" color={tokens.color.ink} onPress={scrollToCurrentMonth} />
          <View style={styles.recordButtonSlot}>
            <HeaderTextButton label="記録" variant="pill" onPress={() => navigation.navigate('Record')} />
          </View>
        </View>
      </View>

      {/* Persistent, not per-week — weeks now scroll continuously with no
          month-shaped item to hang a weekday header off of, so this shows
          once at the top instead of repeating every row. */}
      <WeekdayHeader
        weekStartsOn={weekStartsOn}
        showWeekendColor={settings.showWeekendColor}
        weekendColorMode={settings.weekendColorMode}
      />

      {/* The FAB is positioned inside this wrapper (not the screen root) so
          its `bottom` offset anchors to the calendar area's own edge — which
          now ends right above the banner ad — instead of the whole screen's
          edge, which would otherwise leave it floating over the ad. */}
      <View style={{ flex: 1 }}>
        <FlatList
          ref={listRef}
          style={{ flex: 1 }}
          data={weeks}
          keyExtractor={(week) => week[0].toISOString()}
          renderItem={({ item: week }) => (
            <WeekRow
              week={week}
              events={events}
              categories={categories}
              cycleRecords={cycleRecords}
              predictedRanges={predictedRanges}
              notes={notes}
              settings={settings}
              onDayPress={setSelectedDate}
            />
          )}
          showsVerticalScrollIndicator={false}
          getItemLayout={getItemLayout}
          initialScrollIndex={WEEK_RANGE}
          onScrollBeginDrag={() => {
            hasUserScrolledRef.current = true;
          }}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          windowSize={7}
          maxToRenderPerBatch={10}
        />

        <Pressable
          onPress={() =>
            navigation.navigate('EventForm', { mode: 'create', prefillDate: format(new Date(), 'yyyy-MM-dd') })
          }
          style={[styles.fab, { backgroundColor: tokens.color.ink }]}
        >
          <Ionicons name="add" size={28} color={tokens.color.paper} />
        </Pressable>
      </View>

      <View style={{ alignItems: 'center', backgroundColor: tokens.color.paper }}>
        <AppBannerAd />
      </View>

      <DayDetailSheet
        selectedDate={selectedDate}
        events={events}
        categories={categories}
        notes={notes}
        onChangeDate={setSelectedDate}
        onClose={() => setSelectedDate(null)}
        onAddEvent={(date) =>
          navigation.navigate('EventForm', { mode: 'create', prefillDate: format(date, 'yyyy-MM-dd') })
        }
        onEditEvent={(eventId, occurrenceDate) =>
          navigation.navigate('EventForm', { mode: 'edit', eventId, occurrenceDate: format(occurrenceDate, 'yyyy-MM-dd') })
        }
        onOpenNote={(date) => navigation.navigate('DailyNote', { date: format(date, 'yyyy-MM-dd') })}
      />

      <MonthYearPickerSheet
        visible={isMonthPickerOpen}
        year={headerDate.getFullYear()}
        month={headerDate.getMonth()}
        minYear={minYear}
        maxYear={maxYear}
        onClose={() => setIsMonthPickerOpen(false)}
        onConfirm={(year, month) => {
          scrollToMonth(year, month);
          setIsMonthPickerOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  recordButtonSlot: { marginLeft: 12 },
  fab: {
    position: 'absolute',
    bottom: 8, // relative to the calendar-area wrapper, which now ends just above the banner ad
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
