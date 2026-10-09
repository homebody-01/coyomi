import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { addDays, format } from 'date-fns';
import { ja } from 'date-fns/locale';
import * as Crypto from 'expo-crypto';
import { useLayoutEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { HeaderTextButton } from '../../components/HeaderTextButton';
import { isNoteEmpty } from '../../domain/dailyNote';
import { formatPlainDate, parsePlainDate } from '../../domain/plainDate';
import { useDailyNoteStore } from '../../store/useDailyNoteStore';
import { useTokens } from '../../theme/tokens';
import type { MoodTag } from '../../types/models';
import type { CalendarStackParamList } from '../../types/navigation';

const BODY_TAGS = [
  '頭痛',
  '腹痛',
  '腰痛',
  '胸の張り',
  'むくみ',
  'だるい',
  '疲れやすい',
  '眠い',
  '眠れない',
  '吐き気',
  '食欲がない',
  '食欲が増した',
  '肌荒れ',
  '調子がいい',
];
const MOOD_OPTIONS: { label: string; value: MoodTag }[] = [
  { label: 'イライラ', value: 'irritable' },
  { label: '不安', value: 'anxious' },
  { label: '落ち込み', value: 'down' },
  { label: '落ち着かない', value: 'restless' },
  { label: '何もしたくない', value: 'unmotivated' },
  { label: '集中しづらい', value: 'unfocused' },
  { label: '元気', value: 'energetic' },
  { label: '穏やか', value: 'calm' },
  { label: 'やる気がある', value: 'motivated' },
];

// ~6 months either side — wide enough to free-scroll through other weeks,
// bounded rather than truly infinite so the array/index math stays simple.
// FlatList virtualizes rendering, so this costs nothing until scrolled to.
const STRIP_RANGE_DAYS = 180;
const STRIP_ITEM_WIDTH = 44; // matches stripDay's width
const STRIP_GAP = 4; // matches strip's gap
const STRIP_STEP = STRIP_ITEM_WIDTH + STRIP_GAP;
const STRIP_PADDING = 12; // matches strip's paddingHorizontal

function buildStripDates(center: Date): Date[] {
  const dates: Date[] = [];
  for (let offset = -STRIP_RANGE_DAYS; offset <= STRIP_RANGE_DAYS; offset += 1) {
    dates.push(addDays(center, offset));
  }
  return dates;
}

function stripItemLayout(_: unknown, index: number) {
  return { length: STRIP_STEP, offset: STRIP_STEP * index, index };
}

export default function DailyNoteScreen() {
  const tokens = useTokens();
  const navigation = useNavigation<NativeStackNavigationProp<CalendarStackParamList>>();
  const route = useRoute<RouteProp<CalendarStackParamList, 'DailyNote'>>();
  const notes = useDailyNoteStore((state) => state.notes);
  const saveNote = useDailyNoteStore((state) => state.saveNote);
  const deleteNote = useDailyNoteStore((state) => state.deleteNote);

  const entryDate = parsePlainDate(route.params.date);
  const stripDates = buildStripDates(entryDate);
  const stripListRef = useRef<FlatList<Date>>(null);
  const [visibleMonthLabel, setVisibleMonthLabel] = useState(() => format(entryDate, 'yyyy年M月', { locale: ja }));

  const [currentDate, setCurrentDate] = useState(route.params.date);
  const [bodyTags, setBodyTags] = useState<string[]>(
    () => notes.find((n) => n.date === route.params.date)?.bodyTags ?? [],
  );
  const [moodTags, setMoodTags] = useState<MoodTag[]>(
    () => notes.find((n) => n.date === route.params.date)?.moodTags ?? [],
  );
  const [text, setText] = useState(() => notes.find((n) => n.date === route.params.date)?.text ?? '');

  const commitDate = async (
    dateStr: string,
    tags: string[],
    moods: MoodTag[],
    freeText: string,
  ) => {
    const existing = notes.find((n) => n.date === dateStr);
    const trimmedText = freeText.trim() || undefined;
    if (isNoteEmpty({ bodyTags: tags, moodTags: moods, text: trimmedText })) {
      if (existing) await deleteNote(existing.id);
      return;
    }
    await saveNote({
      id: existing?.id ?? Crypto.randomUUID(),
      date: dateStr,
      bodyTags: tags,
      moodTags: moods,
      text: trimmedText,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSwitchDate = async (dateStr: string) => {
    if (dateStr === currentDate) return;
    await commitDate(currentDate, bodyTags, moodTags, text);
    const next = notes.find((n) => n.date === dateStr);
    setCurrentDate(dateStr);
    setBodyTags(next?.bodyTags ?? []);
    setMoodTags(next?.moodTags ?? []);
    setText(next?.text ?? '');
  };

  const commitCurrentDay = async () => {
    await commitDate(currentDate, bodyTags, moodTags, text);
    navigation.goBack();
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: '体調メモ',
      headerLeft: () => <HeaderTextButton label="キャンセル" onPress={() => navigation.goBack()} />,
      headerRight: () => <HeaderTextButton label="保存" bold onPress={commitCurrentDay} />,
    });
    // commitCurrentDay closes over currentDate/bodyTags/moodTags/text — include
    // them so the header button never fires a stale closure (same reasoning
    // as RecordScreen's header effect).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, currentDate, bodyTags, moodTags, text]);

  const toggleBodyTag = (tag: string) => {
    setBodyTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const toggleMoodTag = (mood: MoodTag) => {
    setMoodTags((prev) => (prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood]));
  };

  // Re-centers the strip on the originally-opened day once its size is
  // known — mirrors MonthScreen's own "scroll to anchor once laid out"
  // pattern, since a plain initialScrollIndex can't center an item (only
  // align it to the start), and the container's width isn't known before
  // first layout.
  const handleStripLayout = () => {
    stripListRef.current?.scrollToIndex({ index: STRIP_RANGE_DAYS, viewPosition: 0.5, animated: false });
  };

  // Tracks whichever date is nearest the horizontal center of the visible
  // strip and shows its month above — otherwise, once the strip is wide
  // enough to scroll through other weeks, it's easy to lose track of which
  // week/month is currently in view.
  const handleStripScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement } = event.nativeEvent;
    const centerX = contentOffset.x + layoutMeasurement.width / 2;
    const rawIndex = (centerX - STRIP_PADDING - STRIP_ITEM_WIDTH / 2) / STRIP_STEP;
    const index = Math.min(Math.max(Math.round(rawIndex), 0), stripDates.length - 1);
    const centeredDate = stripDates[index];
    if (!centeredDate) return;
    const label = format(centeredDate, 'yyyy年M月', { locale: ja });
    setVisibleMonthLabel((prev) => (prev === label ? prev : label));
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.paper }}>
      <Text
        style={{
          color: tokens.color.ink,
          opacity: 0.6,
          fontFamily: tokens.font.family,
          fontSize: 12,
          paddingHorizontal: 16,
          paddingTop: 8,
        }}
      >
        {visibleMonthLabel}
      </Text>
      <FlatList
        ref={stripListRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        data={stripDates}
        keyExtractor={formatPlainDate}
        style={styles.stripList}
        contentContainerStyle={styles.strip}
        getItemLayout={stripItemLayout}
        onLayout={handleStripLayout}
        onScroll={handleStripScroll}
        scrollEventThrottle={32}
        windowSize={5}
        renderItem={({ item: date }) => {
          const dateStr = formatPlainDate(date);
          const selected = dateStr === currentDate;
          const hasNote = notes.some((n) => n.date === dateStr && !isNoteEmpty(n));
          return (
            <Pressable onPress={() => handleSwitchDate(dateStr)} style={styles.stripDay}>
              <Text
                style={{
                  color: tokens.color.ink,
                  opacity: 0.6,
                  fontFamily: tokens.font.family,
                  fontSize: 11,
                }}
              >
                {format(date, 'EEE', { locale: ja })}
              </Text>
              <View
                style={[
                  styles.stripCircle,
                  selected && { backgroundColor: tokens.color.ink },
                ]}
              >
                <Text
                  style={{
                    color: selected ? tokens.color.paper : tokens.color.ink,
                    fontFamily: tokens.font.family,
                    fontSize: 15,
                  }}
                >
                  {date.getDate()}
                </Text>
              </View>
              <View style={[styles.stripDot, hasNote && { backgroundColor: tokens.color.ink }]} />
            </Pressable>
          );
        }}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.sectionLabel, styles.firstSectionLabel, { color: tokens.color.ink, fontFamily: tokens.font.family }]}>
          からだ
        </Text>
        <View style={styles.chipRow}>
          {BODY_TAGS.map((tag) => {
            const active = bodyTags.includes(tag);
            return (
              <Pressable
                key={tag}
                onPress={() => toggleBodyTag(tag)}
                style={[
                  styles.chip,
                  { borderColor: `${tokens.color.ink}33` },
                  active && { backgroundColor: tokens.color.ink, borderColor: tokens.color.ink },
                ]}
              >
                <Text
                  style={{
                    color: active ? tokens.color.paper : tokens.color.ink,
                    fontFamily: tokens.font.family,
                    fontSize: 13,
                  }}
                >
                  {tag}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { color: tokens.color.ink, fontFamily: tokens.font.family }]}>こころ</Text>
        <View style={styles.chipRow}>
          {MOOD_OPTIONS.map((option) => {
            const active = moodTags.includes(option.value);
            return (
              <Pressable
                key={option.value}
                onPress={() => toggleMoodTag(option.value)}
                style={[
                  styles.chip,
                  { borderColor: `${tokens.color.ink}33` },
                  active && { backgroundColor: tokens.color.ink, borderColor: tokens.color.ink },
                ]}
              >
                <Text
                  style={{
                    color: active ? tokens.color.paper : tokens.color.ink,
                    fontFamily: tokens.font.family,
                    fontSize: 13,
                  }}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { color: tokens.color.ink, fontFamily: tokens.font.family }]}>メモ</Text>
        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          style={{
            color: tokens.color.ink,
            fontFamily: tokens.font.family,
            fontSize: 15,
            minHeight: 80,
            paddingVertical: 4,
          }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  stripList: { flexGrow: 0 },
  strip: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4, gap: 4 },
  stripDay: { alignItems: 'center', width: 44, gap: 2 },
  stripCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stripDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'transparent' },
  content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 48 },
  sectionLabel: { fontSize: 13, opacity: 0.6, marginTop: 16, marginBottom: 8 },
  firstSectionLabel: { marginTop: 0 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
});
