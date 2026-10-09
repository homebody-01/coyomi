import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addMonths, format, subMonths } from 'date-fns';
import * as Crypto from 'expo-crypto';
import { useLayoutEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { HeaderTextButton } from '../../components/HeaderTextButton';
import { RecordRangePicker, type PickerState } from '../../components/RecordRangePicker';
import { diffPlainDaysInclusive, formatPlainDate, parsePlainDate, todayPlainDate } from '../../domain/plainDate';
import { useCycleRecordStore } from '../../store/useCycleRecordStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useTokens } from '../../theme/tokens';
import type { CalendarStackParamList } from '../../types/navigation';
import type { CycleRecord } from '../../types/models';

const MAX_DATE = '9999-12-31'; // sentinel for an open-ended record when interval-overlap-checking

function hasOverlap(
  records: CycleRecord[],
  candidate: { startDate: string; endDate: string | null },
  excludeId: string | null,
): boolean {
  const candidateEnd = candidate.endDate ?? MAX_DATE;
  return records.some((record) => {
    if (record.id === excludeId) return false;
    const recordEnd = record.endDate ?? MAX_DATE;
    return candidate.startDate <= recordEnd && record.startDate <= candidateEnd;
  });
}

export default function RecordScreen() {
  const tokens = useTokens();
  const navigation = useNavigation<NativeStackNavigationProp<CalendarStackParamList>>();
  const cycleRecords = useCycleRecordStore((state) => state.cycleRecords);
  const addCycleRecord = useCycleRecordStore((state) => state.addCycleRecord);
  const updateCycleRecord = useCycleRecordStore((state) => state.updateCycleRecord);
  const deleteCycleRecord = useCycleRecordStore((state) => state.deleteCycleRecord);
  const weekStartsOn = useSettingsStore((state) => state.settings.weekStartsOn);

  const openRecord = cycleRecords.find((record) => record.endDate === null) ?? null;

  const [pickerState, setPickerState] = useState<PickerState>(
    openRecord ? { phase: 'ranged', startDate: openRecord.startDate, endDate: null } : { phase: 'idle' },
  );
  const [editingRecordId, setEditingRecordId] = useState<string | null>(openRecord?.id ?? null);
  const anchorDate = openRecord ? parsePlainDate(openRecord.startDate) : new Date();
  const [displayYear, setDisplayYear] = useState(anchorDate.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(anchorDate.getMonth());
  const [openField, setOpenField] = useState<'start' | 'end' | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const handlePrevMonth = () => {
    const d = subMonths(new Date(displayYear, displayMonth, 1), 1);
    setDisplayYear(d.getFullYear());
    setDisplayMonth(d.getMonth());
  };
  const handleNextMonth = () => {
    const d = addMonths(new Date(displayYear, displayMonth, 1), 1);
    setDisplayYear(d.getFullYear());
    setDisplayMonth(d.getMonth());
  };

  const handleDayPress = (dateStr: string) => {
    setOpenField(null);
    if (pickerState.phase === 'idle') {
      setPickerState({ phase: 'pickingStart', startDate: dateStr });
      setEditingRecordId(null);
      return;
    }
    if (pickerState.phase === 'pickingStart') {
      if (dateStr < pickerState.startDate) {
        setPickerState({ phase: 'pickingStart', startDate: dateStr });
        return;
      }
      setPickerState({ phase: 'ranged', startDate: pickerState.startDate, endDate: dateStr });
      return;
    }
    // Already `ranged`: tapping the grid again starts a brand-new pick
    // rather than resizing the current range (see plan §5 — drag-to-resize
    // is deferred; adjusting the current range's edges happens via the
    // 開始/終了 value rows below, not by tapping the grid again).
    setPickerState({ phase: 'pickingStart', startDate: dateStr });
    setEditingRecordId(null);
  };

  const handleConfirm = async () => {
    if (pickerState.phase !== 'ranged') return;
    const { startDate, endDate } = pickerState;
    if (endDate !== null && endDate < startDate) {
      Alert.alert('日付が正しくありません', '終了は開始と同じか後の日付にしてください。');
      return;
    }
    if (hasOverlap(cycleRecords, { startDate, endDate }, editingRecordId)) {
      Alert.alert('記録が重なっています', 'この期間はすでにある記録と重なっています。');
      return;
    }
    const nowIso = new Date().toISOString();
    if (editingRecordId) {
      const existing = cycleRecords.find((record) => record.id === editingRecordId);
      await updateCycleRecord({
        id: editingRecordId,
        startDate,
        endDate,
        createdAt: existing?.createdAt ?? nowIso,
        updatedAt: nowIso,
      });
    } else {
      await addCycleRecord({ id: Crypto.randomUUID(), startDate, endDate, createdAt: nowIso, updatedAt: nowIso });
    }
    navigation.goBack();
  };

  const handleStartOpenRecord = async () => {
    if (pickerState.phase !== 'pickingStart') return;
    const { startDate } = pickerState;
    // "記録中"(終了日未定)は今まさに続いている記録を表すので、開始日が
    // 未来にはなり得ない — 許してしまうと、後で「今日で終わりにする」を
    // 押したときに終了日が開始日より前になってしまう。
    if (startDate > todayPlainDate()) {
      Alert.alert('開始日が未来の日付です', '終了日を未定のまま記録を開始する場合、開始日は本日以前の日付にしてください。');
      return;
    }
    if (hasOverlap(cycleRecords, { startDate, endDate: null }, null)) {
      Alert.alert('記録が重なっています', 'この期間はすでにある記録と重なっています。');
      return;
    }
    const nowIso = new Date().toISOString();
    await addCycleRecord({ id: Crypto.randomUUID(), startDate, endDate: null, createdAt: nowIso, updatedAt: nowIso });
    navigation.goBack();
  };

  const handleEndToday = async () => {
    if (pickerState.phase !== 'ranged' || pickerState.endDate !== null || !editingRecordId) return;
    // Defensive check — the button itself is hidden once the start date is in
    // the future (see below), but this guards against already-invalid data
    // saved before that guard existed.
    if (pickerState.startDate > todayPlainDate()) return;
    const existing = cycleRecords.find((record) => record.id === editingRecordId);
    if (!existing) return;
    await updateCycleRecord({ ...existing, endDate: todayPlainDate(), updatedAt: new Date().toISOString() });
    navigation.goBack();
  };

  const handleDelete = () => {
    if (!editingRecordId) return;
    const targetId = editingRecordId;
    Alert.alert('この記録を削除', '削除すると元に戻せません。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          await deleteCycleRecord(targetId);
          navigation.goBack();
        },
      },
    ]);
  };

  const handleSelectPastRecord = (record: CycleRecord) => {
    setPickerState({ phase: 'ranged', startDate: record.startDate, endDate: record.endDate });
    setEditingRecordId(record.id);
    const d = parsePlainDate(record.startDate);
    setDisplayYear(d.getFullYear());
    setDisplayMonth(d.getMonth());
    setOpenField(null);
    // Selecting a past record loads it into the editable card at the top —
    // scroll there so that's actually visible instead of silently updating
    // off-screen while the user is still looking at the list below.
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: '記録',
      headerLeft: () => <HeaderTextButton label="キャンセル" onPress={() => navigation.goBack()} />,
      headerRight: () => (
        <HeaderTextButton label="完了" bold disabled={pickerState.phase !== 'ranged'} onPress={handleConfirm} />
      ),
    });
    // handleConfirm closes over pickerState/editingRecordId/cycleRecords —
    // include them so the header button never fires a stale closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, pickerState, editingRecordId, cycleRecords]);

  const finishedRecords = [...cycleRecords]
    .filter((record) => record.endDate !== null)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  return (
    <ScrollView
      ref={scrollViewRef}
      style={{ flex: 1, backgroundColor: tokens.color.paper }}
      contentContainerStyle={styles.content}
    >
      {pickerState.phase === 'pickingStart' && (
        <View style={[styles.card, { backgroundColor: `${tokens.color.ink}1A`, borderRadius: tokens.radius.card }]}>
          <Text style={[styles.headline, { color: tokens.color.ink, fontFamily: tokens.font.family }]}>
            開始 {format(parsePlainDate(pickerState.startDate), 'M月d日')}
          </Text>
          <Pressable
            style={[styles.primaryButton, { backgroundColor: tokens.color.ink, borderRadius: tokens.radius.card, marginTop: 0 }]}
            onPress={handleStartOpenRecord}
          >
            <Text style={{ color: tokens.color.paper, fontFamily: tokens.font.family, fontSize: 15 }}>
              終了日は未定のまま記録を開始
            </Text>
          </Pressable>
          <Text
            style={{
              color: tokens.color.ink,
              opacity: 0.5,
              fontFamily: tokens.font.family,
              fontSize: 12,
              marginTop: 8,
              textAlign: 'center',
            }}
          >
            終了日が分かっていれば、カレンダーでその日をタップしてください
          </Text>
        </View>
      )}

      {pickerState.phase === 'ranged' && (
        <>
          <View style={[styles.card, { backgroundColor: `${tokens.color.ink}1A`, borderRadius: tokens.radius.card }]}>
            <Text style={[styles.headline, { color: tokens.color.terracotta, fontFamily: tokens.font.family }]}>
              {pickerState.endDate === null
                ? `記録中 ${diffPlainDaysInclusive(pickerState.startDate, todayPlainDate())}日目`
                : `${diffPlainDaysInclusive(pickerState.startDate, pickerState.endDate)}日間`}
            </Text>

            <View style={styles.dateRow}>
              <Pressable onPress={() => setOpenField(openField === 'start' ? null : 'start')} style={styles.dateField}>
                <Text style={[styles.dateLabel, { color: tokens.color.ink, fontFamily: tokens.font.family }]}>開始</Text>
                <Text style={[styles.dateValue, { color: tokens.color.ink, fontFamily: tokens.font.family }]}>
                  {format(parsePlainDate(pickerState.startDate), 'M月d日')}
                </Text>
              </Pressable>
              <Text style={{ color: tokens.color.ink, opacity: 0.4 }}>-</Text>
              <Pressable onPress={() => setOpenField(openField === 'end' ? null : 'end')} style={styles.dateField}>
                <Text style={[styles.dateLabel, { color: tokens.color.ink, fontFamily: tokens.font.family }]}>終了</Text>
                <Text style={[styles.dateValue, { color: tokens.color.ink, fontFamily: tokens.font.family }]}>
                  {pickerState.endDate ? format(parsePlainDate(pickerState.endDate), 'M月d日') : '未定'}
                </Text>
              </Pressable>
            </View>

            {openField === 'start' && (
              <DateTimePicker
                value={parsePlainDate(pickerState.startDate)}
                mode="date"
                display="spinner"
                onValueChange={(_, date) => {
                  if (!date) return;
                  setPickerState({ ...pickerState, startDate: formatPlainDate(date) });
                }}
              />
            )}
            {openField === 'end' && (
              <DateTimePicker
                value={pickerState.endDate ? parsePlainDate(pickerState.endDate) : new Date()}
                mode="date"
                display="spinner"
                onValueChange={(_, date) => {
                  if (!date) return;
                  setPickerState({ ...pickerState, endDate: formatPlainDate(date) });
                }}
              />
            )}
          </View>

          {pickerState.endDate === null && editingRecordId && pickerState.startDate <= todayPlainDate() && (
            <Pressable
              style={[styles.primaryButton, { backgroundColor: tokens.color.ink, borderRadius: tokens.radius.card }]}
              onPress={handleEndToday}
            >
              <Text style={{ color: tokens.color.paper, fontFamily: tokens.font.family, fontSize: 15 }}>
                今日（{format(new Date(), 'M月d日')}）で終わりにする
              </Text>
            </Pressable>
          )}

          {editingRecordId && (
            <Pressable style={styles.deleteRow} onPress={handleDelete}>
              <Text style={{ color: tokens.color.sunday, fontFamily: tokens.font.family, fontSize: 15 }}>
                この記録を削除
              </Text>
            </Pressable>
          )}
        </>
      )}

      <RecordRangePicker
        year={displayYear}
        month={displayMonth}
        weekStartsOn={weekStartsOn}
        pickerState={pickerState}
        onDayPress={handleDayPress}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
      />

      <View style={styles.pastSection}>
        <Text style={[styles.sectionTitle, { color: tokens.color.ink, fontFamily: tokens.font.family }]}>
          これまでの記録
        </Text>
        {finishedRecords.map((record) => (
          <Pressable key={record.id} style={styles.pastRow} onPress={() => handleSelectPastRecord(record)}>
            <Text style={{ color: tokens.color.ink, fontFamily: tokens.font.family, fontSize: 14 }}>
              {format(parsePlainDate(record.startDate), 'M月d日')} - {format(parsePlainDate(record.endDate as string), 'M月d日')}
            </Text>
            <Text style={{ color: tokens.color.ink, fontFamily: tokens.font.family, fontSize: 14, opacity: 0.6 }}>
              {diffPlainDaysInclusive(record.startDate, record.endDate as string)}日間 ›
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },
  card: { marginBottom: 16, padding: 16 },
  headline: { fontSize: 17, fontWeight: '600', marginBottom: 8 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  dateField: { flex: 1 },
  dateLabel: { fontSize: 12, opacity: 0.6 },
  dateValue: { fontSize: 16 },
  primaryButton: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  deleteRow: { alignItems: 'center', paddingVertical: 14 },
  pastSection: { marginTop: 24 },
  sectionTitle: { fontSize: 13, opacity: 0.6, marginBottom: 8 },
  pastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
});
