import { Ionicons } from '@expo/vector-icons';
import { isToday } from 'date-fns';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { WeekdayHeader } from './WeekdayHeader';
import { getMonthWeeks } from '../domain/monthGrid';
import { formatPlainDate, todayPlainDate } from '../domain/plainDate';
import { useTokens } from '../theme/tokens';

export type PickerState =
  | { phase: 'idle' }
  | { phase: 'pickingStart'; startDate: string }
  | { phase: 'ranged'; startDate: string; endDate: string | null };

interface RecordRangePickerProps {
  year: number;
  month: number;
  weekStartsOn: 0 | 1 | 6;
  pickerState: PickerState;
  onDayPress: (dateStr: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

function getHighlightRange(pickerState: PickerState): { start: string; end: string } | null {
  if (pickerState.phase === 'pickingStart') {
    return { start: pickerState.startDate, end: pickerState.startDate };
  }
  if (pickerState.phase === 'ranged') {
    return { start: pickerState.startDate, end: pickerState.endDate ?? todayPlainDate() };
  }
  return null;
}

function RangeDayCell({
  date,
  isCurrentMonth,
  highlight,
  onPress,
}: {
  date: Date;
  isCurrentMonth: boolean;
  highlight: { start: string; end: string } | null;
  onPress: (dateStr: string) => void;
}) {
  const tokens = useTokens();
  const dateStr = formatPlainDate(date);
  const isStart = highlight?.start === dateStr;
  const isEnd = highlight?.end === dateStr;
  const isSelected = isStart || isEnd;
  const isWithinRange = !!highlight && dateStr >= highlight.start && dateStr <= highlight.end;
  const today = isToday(date);

  return (
    <Pressable style={styles.cell} onPress={() => onPress(dateStr)}>
      {isWithinRange && (
        <View
          style={[
            styles.band,
            { backgroundColor: `${tokens.color.terracotta}22` },
            isStart && styles.bandRoundLeft,
            isEnd && styles.bandRoundRight,
          ]}
        />
      )}
      <View
        style={[
          styles.circle,
          isSelected && { backgroundColor: tokens.color.ink },
          !isSelected && today && { borderWidth: 1, borderColor: tokens.color.ink },
        ]}
      >
        <Text
          style={{
            color: isSelected ? tokens.color.paper : tokens.color.ink,
            fontFamily: tokens.font.family,
            fontSize: 13,
            opacity: isCurrentMonth ? 1 : 0.35,
          }}
        >
          {date.getDate()}
        </Text>
      </View>
    </Pressable>
  );
}

export function RecordRangePicker({
  year,
  month,
  weekStartsOn,
  pickerState,
  onDayPress,
  onPrevMonth,
  onNextMonth,
}: RecordRangePickerProps) {
  const tokens = useTokens();
  const weeks = getMonthWeeks(year, month, weekStartsOn);
  const highlight = getHighlightRange(pickerState);
  const monthLabel = `${year}年${month + 1}月`;
  const instruction = pickerState.phase === 'idle' ? 'タップで開始、もう一度で終了' : '';

  return (
    <View>
      <View style={styles.header}>
        <Pressable onPress={onPrevMonth} hitSlop={12}>
          <Ionicons name="chevron-back" size={18} color={tokens.color.ink} />
        </Pressable>
        <Text style={{ color: tokens.color.ink, fontFamily: tokens.font.family, fontSize: 15 }}>{monthLabel}</Text>
        <Pressable onPress={onNextMonth} hitSlop={12}>
          <Ionicons name="chevron-forward" size={18} color={tokens.color.ink} />
        </Pressable>
      </View>
      {instruction.length > 0 && (
        <Text style={{ color: tokens.color.ink, opacity: 0.6, fontFamily: tokens.font.family, fontSize: 12, marginBottom: 4 }}>
          {instruction}
        </Text>
      )}
      <WeekdayHeader weekStartsOn={weekStartsOn} />
      {weeks.map((week) => (
        <View key={week[0].toISOString()} style={{ flexDirection: 'row' }}>
          {week.map((date) => (
            <RangeDayCell
              key={date.toISOString()}
              date={date}
              isCurrentMonth={date.getMonth() === month}
              highlight={highlight}
              onPress={onDayPress}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  cell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  circle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  band: { position: 'absolute', left: 0, right: 0, top: '20%', bottom: '20%' },
  bandRoundLeft: { left: '50%' },
  bandRoundRight: { right: '50%' },
});
