import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addMonths, format, getHours, getMinutes, parseISO, set, startOfDay, subMonths } from 'date-fns';
import * as Crypto from 'expo-crypto';
import { useLayoutEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  Alert,
  LayoutAnimation,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { HeaderTextButton } from '../../components/HeaderTextButton';
import { PickerRow } from '../../components/PickerRow';
import { RecordRangePicker, type PickerState } from '../../components/RecordRangePicker';
import { cancelEventReminder, syncEventReminder } from '../../domain/notifications';
import { formatPlainDate, parsePlainDate } from '../../domain/plainDate';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useEventStore } from '../../store/useEventStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useTokens } from '../../theme/tokens';
import type { CalendarStackParamList } from '../../types/navigation';
import type { Event, Category } from '../../types/models';

const REMINDER_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'なし', value: null },
  { label: '5分前', value: 5 },
  { label: '10分前', value: 10 },
  { label: '15分前', value: 15 },
  { label: '30分前', value: 30 },
  { label: '1時間前', value: 60 },
];

type CategoryPanelState = { mode: 'create' } | { mode: 'edit'; categoryId: string } | null;

// The first swatch not already claimed by another category — so opening the
// "add category" panel never defaults to a color that's already taken.
function firstAvailableColor(categories: Category[], swatches: readonly string[], excludeCategoryId?: string): string {
  const used = new Set(categories.filter((c) => c.id !== excludeCategoryId).map((c) => c.colorHex));
  return swatches.find((hex) => !used.has(hex)) ?? swatches[0];
}

type RecurrenceFreq = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

const RECURRENCE_OPTIONS: { label: string; value: RecurrenceFreq }[] = [
  { label: 'なし', value: 'none' },
  { label: '毎日', value: 'daily' },
  { label: '毎週', value: 'weekly' },
  { label: '毎月', value: 'monthly' },
  { label: '毎年', value: 'yearly' },
];

interface EventFormValues {
  title: string;
  isAllDay: boolean;
  date: Date;
  endDate: Date; // all-day events only — last day of the range, inclusive
  startTime: Date;
  endTime: Date;
  categoryId: string | null;
  reminderMinutesBefore: number | null;
  recurrenceFreq: RecurrenceFreq;
  location: string;
  memo: string;
}

function buildDefaultValues(existingEvent: Event | undefined, prefillDate: string | undefined, firstCategoryId: string | null): EventFormValues {
  if (existingEvent) {
    return {
      title: existingEvent.title,
      isAllDay: existingEvent.isAllDay,
      date: parseISO(existingEvent.startAt),
      endDate: parseISO(existingEvent.endAt),
      startTime: parseISO(existingEvent.startAt),
      endTime: parseISO(existingEvent.endAt),
      categoryId: existingEvent.categoryId,
      reminderMinutesBefore: existingEvent.reminderMinutesBefore ?? null,
      recurrenceFreq: existingEvent.recurrenceRule?.freq ?? 'none',
      location: existingEvent.location ?? '',
      memo: existingEvent.memo ?? '',
    };
  }
  const day = prefillDate ? parseISO(prefillDate) : startOfDay(new Date());
  return {
    title: '',
    isAllDay: false,
    date: day,
    endDate: day,
    startTime: set(day, { hours: 9, minutes: 0 }),
    endTime: set(day, { hours: 10, minutes: 0 }),
    categoryId: firstCategoryId,
    reminderMinutesBefore: 30,
    recurrenceFreq: 'none',
    location: '',
    memo: '',
  };
}

export default function EventFormScreen() {
  const tokens = useTokens();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<CalendarStackParamList, 'EventForm'>>();
  const params = route.params;
  const isEdit = params.mode === 'edit';

  const categories = useCategoryStore((state) => state.categories);
  const addCategory = useCategoryStore((state) => state.addCategory);
  const updateCategory = useCategoryStore((state) => state.updateCategory);
  const deleteCategory = useCategoryStore((state) => state.deleteCategory);
  const events = useEventStore((state) => state.events);
  const addEvent = useEventStore((state) => state.addEvent);
  const updateEvent = useEventStore((state) => state.updateEvent);
  const deleteEvent = useEventStore((state) => state.deleteEvent);

  const existingEvent = params.mode === 'edit' ? events.find((e) => e.id === params.eventId) : undefined;
  // Which calendar day was tapped to reach this edit — only meaningful for a
  // recurring event, where it lets "delete this occurrence only" record just
  // that one date instead of touching the whole series.
  const occurrenceDate = params.mode === 'edit' ? params.occurrenceDate : undefined;
  const weekStartsOn = useSettingsStore((state) => state.settings.weekStartsOn);

  const initialValues = buildDefaultValues(
    existingEvent,
    params.mode === 'create' ? params.prefillDate : undefined,
    categories[0]?.id ?? null,
  );
  const { control, handleSubmit, setValue, getValues } = useForm<EventFormValues>({
    defaultValues: initialValues,
  });

  const title = useWatch({ control, name: 'title' });
  const isAllDay = useWatch({ control, name: 'isAllDay' });
  const categoryId = useWatch({ control, name: 'categoryId' });
  const startTime = useWatch({ control, name: 'startTime' });
  const endTime = useWatch({ control, name: 'endTime' });
  const [openField, setOpenField] = useState<'date' | 'time' | null>(null);
  const [categoryPanel, setCategoryPanel] = useState<CategoryPanelState>(null);
  const [categoryNameInput, setCategoryNameInput] = useState('');
  const [categoryColorInput, setCategoryColorInput] = useState<string>(tokens.color.category[0]);

  // Drives the embedded all-day range calendar. Mirrors RecordScreen's own
  // start/end picker exactly (same PickerState machine, same
  // pickingStart-swaps-if-earlier and ranged-tap-starts-a-new-pick rules) so
  // the interaction feels identical between "記録" and an all-day event.
  const [rangeState, setRangeState] = useState<PickerState>(
    initialValues.isAllDay
      ? { phase: 'ranged', startDate: formatPlainDate(initialValues.date), endDate: formatPlainDate(initialValues.endDate) }
      : { phase: 'idle' },
  );
  const [rangeDisplayYear, setRangeDisplayYear] = useState(initialValues.date.getFullYear());
  const [rangeDisplayMonth, setRangeDisplayMonth] = useState(initialValues.date.getMonth());

  const isTimeValid = isAllDay || endTime.getTime() > startTime.getTime();
  const canSubmit =
    title.trim().length > 0 && isTimeValid && (!isAllDay || (rangeState.phase === 'ranged' && rangeState.endDate !== null));

  const onSubmit = async (values: EventFormValues) => {
    const nowIso = new Date().toISOString();
    const startAt = values.isAllDay
      ? startOfDay(values.date).toISOString()
      : set(values.date, { hours: getHours(values.startTime), minutes: getMinutes(values.startTime) }).toISOString();
    const endAt = values.isAllDay
      ? startOfDay(values.endDate).toISOString()
      : set(values.date, { hours: getHours(values.endTime), minutes: getMinutes(values.endTime) }).toISOString();

    const event: Event = {
      id: existingEvent ? existingEvent.id : Crypto.randomUUID(),
      title: values.title.trim(),
      isAllDay: values.isAllDay,
      startAt,
      endAt,
      categoryId: values.categoryId,
      location: values.location.trim() || undefined,
      memo: values.memo.trim() || undefined,
      reminderMinutesBefore: values.reminderMinutesBefore ?? undefined,
      recurrenceRule: values.recurrenceFreq === 'none' ? null : { freq: values.recurrenceFreq },
      // Exclusions only mean anything while the series is still recurring —
      // turning off 繰り返し drops any this-occurrence-only deletions from
      // the old series along with it, since there's no longer a series for
      // them to exclude a date from.
      excludedDates: values.recurrenceFreq === 'none' ? [] : (existingEvent?.excludedDates ?? []),
      createdAt: existingEvent ? existingEvent.createdAt : nowIso,
      updatedAt: nowIso,
    };

    if (existingEvent) {
      await updateEvent(event);
    } else {
      await addEvent(event);
    }
    await syncEventReminder(event);
    navigation.goBack();
  };

  const handleDeleteWholeSeries = async (event: Event) => {
    await cancelEventReminder(event.id);
    await deleteEvent(event.id);
    navigation.goBack();
  };

  // Notifications are scheduled as a single OS-level recurring trigger for
  // the whole series (see notifications.ts), not one per occurrence — there
  // is no individual reminder to cancel for the excluded date alone, so a
  // reminder may still fire on a date whose event was excluded this way.
  const handleDeleteSingleOccurrence = async (event: Event, dateStr: string) => {
    await updateEvent({
      ...event,
      excludedDates: [...event.excludedDates, dateStr],
      updatedAt: new Date().toISOString(),
    });
    navigation.goBack();
  };

  const handleDelete = () => {
    if (!existingEvent) return;

    if (existingEvent.recurrenceRule && occurrenceDate) {
      Alert.alert('繰り返しの予定を削除', 'この予定だけを削除しますか？繰り返しすべてを削除しますか？', [
        { text: 'キャンセル', style: 'cancel' },
        { text: 'この予定のみ削除', style: 'destructive', onPress: () => handleDeleteSingleOccurrence(existingEvent, occurrenceDate) },
        { text: 'すべて削除', style: 'destructive', onPress: () => handleDeleteWholeSeries(existingEvent) },
      ]);
      return;
    }

    Alert.alert('予定を削除', '削除すると元に戻せません。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: () => handleDeleteWholeSeries(existingEvent) },
    ]);
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEdit ? '予定を編集' : '新しい予定',
      headerLeft: () => <HeaderTextButton label="キャンセル" onPress={() => navigation.goBack()} />,
      headerRight: () => (
        <HeaderTextButton label={isEdit ? '保存' : '追加'} onPress={handleSubmit(onSubmit)} bold disabled={!canSubmit} />
      ),
    });
    // handleSubmit/onSubmit are omitted deliberately — onSubmit always reads
    // current form state via react-hook-form's internal store, not this
    // closure, so rebinding on every keystroke isn't needed. canSubmit IS
    // included since the disabled prop must reflect it at render time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, isEdit, canSubmit]);

  const handleAllDayToggle = (value: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setValue('isAllDay', value);
    if (value) {
      const current = getValues('date');
      const currentStr = formatPlainDate(current);
      setValue('endDate', current);
      setRangeState({ phase: 'ranged', startDate: currentStr, endDate: currentStr });
      setRangeDisplayYear(current.getFullYear());
      setRangeDisplayMonth(current.getMonth());
    }
  };

  const handleRangeDayPress = (dateStr: string) => {
    if (rangeState.phase === 'idle') {
      setRangeState({ phase: 'pickingStart', startDate: dateStr });
      return;
    }
    if (rangeState.phase === 'pickingStart') {
      if (dateStr < rangeState.startDate) {
        setRangeState({ phase: 'pickingStart', startDate: dateStr });
        return;
      }
      setRangeState({ phase: 'ranged', startDate: rangeState.startDate, endDate: dateStr });
      setValue('date', parsePlainDate(rangeState.startDate));
      setValue('endDate', parsePlainDate(dateStr));
      return;
    }
    // Already `ranged`: tapping the grid again starts a brand-new pick,
    // matching RecordScreen's identical picker.
    setRangeState({ phase: 'pickingStart', startDate: dateStr });
  };

  const handleRangePrevMonth = () => {
    const d = subMonths(new Date(rangeDisplayYear, rangeDisplayMonth, 1), 1);
    setRangeDisplayYear(d.getFullYear());
    setRangeDisplayMonth(d.getMonth());
  };
  const handleRangeNextMonth = () => {
    const d = addMonths(new Date(rangeDisplayYear, rangeDisplayMonth, 1), 1);
    setRangeDisplayYear(d.getFullYear());
    setRangeDisplayMonth(d.getMonth());
  };

  const openCreateCategoryPanel = () => {
    if (categoryPanel?.mode === 'create') {
      setCategoryPanel(null);
      return;
    }
    setCategoryNameInput('');
    setCategoryColorInput(firstAvailableColor(categories, tokens.color.category));
    setCategoryPanel({ mode: 'create' });
  };

  const openEditCategoryPanel = (category: Category) => {
    if (categoryPanel?.mode === 'edit' && categoryPanel.categoryId === category.id) {
      setCategoryPanel(null);
      return;
    }
    setCategoryNameInput(category.name);
    setCategoryColorInput(category.colorHex);
    setCategoryPanel({ mode: 'edit', categoryId: category.id });
  };

  const handleConfirmCategoryPanel = async () => {
    const name = categoryNameInput.trim();
    if (!name || !categoryPanel) return;
    if (categoryPanel.mode === 'edit') {
      await updateCategory({ id: categoryPanel.categoryId, name, colorHex: categoryColorInput });
    } else {
      const category = await addCategory({ name, colorHex: categoryColorInput });
      setValue('categoryId', category.id);
    }
    setCategoryPanel(null);
  };

  const handleDeleteCategory = () => {
    if (categoryPanel?.mode !== 'edit') return;
    const targetId = categoryPanel.categoryId;
    Alert.alert('このカテゴリーを削除', '削除すると元に戻せません。このカテゴリーが設定された予定は「カテゴリーなし」になります。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          await deleteCategory(targetId);
          if (categoryId === targetId) setValue('categoryId', null);
          setCategoryPanel(null);
        },
      },
    ]);
  };

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const usedCategoryColors = new Set(
    categories
      .filter((c) => !(categoryPanel?.mode === 'edit' && c.id === categoryPanel.categoryId))
      .map((c) => c.colorHex),
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.color.paper }}
      contentContainerStyle={styles.content}
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
    >
      <Controller
        control={control}
        name="title"
        render={({ field: { value, onChange } }) => (
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder="タイトルを入力"
            placeholderTextColor={`${tokens.color.ink}66`}
            style={[styles.titleInput, { color: tokens.color.ink, fontFamily: tokens.font.family }]}
          />
        )}
      />

      <View style={styles.row}>
        <Text style={[styles.rowLabel, { color: tokens.color.ink, fontFamily: tokens.font.family }]}>終日</Text>
        <Controller
          control={control}
          name="isAllDay"
          render={({ field: { value } }) => (
            <Switch value={value} onValueChange={handleAllDayToggle} trackColor={{ true: tokens.color.terracotta }} />
          )}
        />
      </View>

      {!isAllDay && (
        <Controller
          control={control}
          name="date"
          render={({ field: { value, onChange } }) => (
            <View>
              <Pressable style={styles.row} onPress={() => setOpenField(openField === 'date' ? null : 'date')}>
                <Text style={[styles.rowLabel, { color: tokens.color.ink, fontFamily: tokens.font.family }]}>日付</Text>
                <Text style={{ color: tokens.color.ink, fontFamily: tokens.font.family, fontSize: 15, opacity: 0.6 }}>
                  {format(value, 'yyyy年M月d日')} ›
                </Text>
              </Pressable>
              {openField === 'date' && (
                <DateTimePicker
                  value={value}
                  mode="date"
                  display="spinner"
                  onValueChange={(_, date) => onChange(date)}
                />
              )}
            </View>
          )}
        />
      )}

      {isAllDay && (
        <View>
          <View style={styles.rangeRow}>
            <View style={styles.rangeField}>
              <Text style={[styles.dateLabel, { color: tokens.color.ink, fontFamily: tokens.font.family }]}>開始</Text>
              <Text style={{ color: tokens.color.ink, fontFamily: tokens.font.family, fontSize: 16 }}>
                {format(parsePlainDate(rangeState.phase === 'idle' ? formatPlainDate(getValues('date')) : rangeState.startDate), 'M月d日')}
              </Text>
            </View>
            <Text style={{ color: tokens.color.ink, opacity: 0.4 }}>-</Text>
            <View style={styles.rangeField}>
              <Text style={[styles.dateLabel, { color: tokens.color.ink, fontFamily: tokens.font.family }]}>終了</Text>
              <Text style={{ color: tokens.color.ink, fontFamily: tokens.font.family, fontSize: 16 }}>
                {rangeState.phase === 'ranged' && rangeState.endDate
                  ? format(parsePlainDate(rangeState.endDate), 'M月d日')
                  : '選択中'}
              </Text>
            </View>
          </View>
          <RecordRangePicker
            year={rangeDisplayYear}
            month={rangeDisplayMonth}
            weekStartsOn={weekStartsOn}
            pickerState={rangeState}
            onDayPress={handleRangeDayPress}
            onPrevMonth={handleRangePrevMonth}
            onNextMonth={handleRangeNextMonth}
          />
        </View>
      )}

      {!isAllDay && (
        <Pressable style={styles.row} onPress={() => setOpenField(openField === 'time' ? null : 'time')}>
          <Text style={[styles.rowLabel, { color: tokens.color.ink, fontFamily: tokens.font.family }]}>時刻</Text>
          <Text style={{ color: tokens.color.ink, fontFamily: tokens.font.family, fontSize: 15, opacity: 0.6 }}>
            {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')} ›
          </Text>
        </Pressable>
      )}
      {!isAllDay && openField === 'time' && (
        <View>
          <Controller
            control={control}
            name="startTime"
            render={({ field: { value, onChange } }) => (
              <View>
                <Text style={{ color: tokens.color.ink, fontFamily: tokens.font.family, fontSize: 12, opacity: 0.6 }}>
                  開始
                </Text>
                <DateTimePicker value={value} mode="time" display="spinner" onValueChange={(_, date) => onChange(date)} />
              </View>
            )}
          />
          <Controller
            control={control}
            name="endTime"
            render={({ field: { value, onChange } }) => (
              <View>
                <Text style={{ color: tokens.color.ink, fontFamily: tokens.font.family, fontSize: 12, opacity: 0.6 }}>
                  終了
                </Text>
                <DateTimePicker value={value} mode="time" display="spinner" onValueChange={(_, date) => onChange(date)} />
              </View>
            )}
          />
        </View>
      )}

      <View style={styles.row}>
        <Text style={[styles.rowLabel, { color: tokens.color.ink, fontFamily: tokens.font.family }]}>カテゴリー</Text>
        {selectedCategory && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: selectedCategory.colorHex }} />
            <Text style={{ color: tokens.color.ink, fontFamily: tokens.font.family, fontSize: 15, opacity: 0.6 }}>
              {selectedCategory.name}
            </Text>
          </View>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {categories.map((category: Category) => (
          <Pressable
            key={category.id}
            onPress={() => setValue('categoryId', category.id)}
            onLongPress={() => openEditCategoryPanel(category)}
            style={[
              styles.chip,
              {
                borderColor: category.colorHex,
                backgroundColor: categoryId === category.id ? category.colorHex : 'transparent',
              },
            ]}
          >
            <Text
              style={{
                color: categoryId === category.id ? tokens.color.paper : tokens.color.ink,
                fontFamily: tokens.font.family,
                fontSize: 13,
              }}
            >
              {category.name}
            </Text>
          </Pressable>
        ))}
        <Pressable onPress={openCreateCategoryPanel} style={[styles.chip, { borderColor: `${tokens.color.ink}33` }]}>
          <Text style={{ color: tokens.color.ink, fontFamily: tokens.font.family, fontSize: 13 }}>＋</Text>
        </Pressable>
      </ScrollView>
      <Text style={{ color: tokens.color.ink, opacity: 0.4, fontFamily: tokens.font.family, fontSize: 11 }}>
        長押しでカテゴリーを編集
      </Text>

      {categoryPanel && (
        <View style={styles.newCategoryBox}>
          <TextInput
            value={categoryNameInput}
            onChangeText={setCategoryNameInput}
            placeholder="カテゴリー名"
            placeholderTextColor={`${tokens.color.ink}66`}
            style={{ color: tokens.color.ink, fontFamily: tokens.font.family, fontSize: 15, paddingVertical: 8 }}
          />
          <View style={styles.swatchGrid}>
            {tokens.color.category.map((hex) => {
              const isUsed = usedCategoryColors.has(hex);
              const isSelected = categoryColorInput === hex;
              return (
                <Pressable
                  key={hex}
                  disabled={isUsed}
                  onPress={() => setCategoryColorInput(hex)}
                  style={[
                    styles.swatch,
                    { backgroundColor: hex, opacity: isUsed ? 0.35 : 1 },
                    isSelected && !isUsed && { borderWidth: 2, borderColor: tokens.color.ink },
                  ]}
                >
                  {isUsed && (
                    <Text style={{ color: tokens.color.paper, fontSize: 14, fontWeight: '700' }}>×</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
          <View style={styles.categoryPanelActions}>
            {categoryPanel.mode === 'edit' && (
              <Pressable onPress={handleDeleteCategory} style={styles.newCategoryConfirm}>
                <Text style={{ color: tokens.color.sunday, fontFamily: tokens.font.family, fontSize: 15 }}>削除</Text>
              </Pressable>
            )}
            <Pressable onPress={handleConfirmCategoryPanel} style={styles.newCategoryConfirm}>
              <Text style={{ color: tokens.color.terracotta, fontFamily: tokens.font.family, fontSize: 15 }}>
                {categoryPanel.mode === 'edit' ? '保存' : '作成'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      <Controller
        control={control}
        name="reminderMinutesBefore"
        render={({ field: { value, onChange } }) => (
          <PickerRow label="通知" value={value} options={REMINDER_OPTIONS} onChange={onChange} />
        )}
      />

      <Controller
        control={control}
        name="recurrenceFreq"
        render={({ field: { value, onChange } }) => (
          <PickerRow label="繰り返し" value={value} options={RECURRENCE_OPTIONS} onChange={onChange} />
        )}
      />

      <View style={styles.textFieldGroup}>
        <Text style={[styles.rowLabel, { color: tokens.color.ink, fontFamily: tokens.font.family }]}>場所</Text>
        <Controller
          control={control}
          name="location"
          render={({ field: { value, onChange } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              style={{ color: tokens.color.ink, fontFamily: tokens.font.family, fontSize: 15, paddingVertical: 4 }}
            />
          )}
        />
      </View>

      <View style={styles.textFieldGroup}>
        <Text style={[styles.rowLabel, { color: tokens.color.ink, fontFamily: tokens.font.family }]}>メモ</Text>
        <Controller
          control={control}
          name="memo"
          render={({ field: { value, onChange } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              multiline
              style={{ color: tokens.color.ink, fontFamily: tokens.font.family, fontSize: 15, paddingVertical: 4, minHeight: 60 }}
            />
          )}
        />
      </View>

      {isEdit && (
        <Pressable style={styles.deleteRow} onPress={handleDelete}>
          <Text style={{ color: tokens.color.sunday, fontFamily: tokens.font.family, fontSize: 15 }}>予定を削除</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },
  titleInput: { fontSize: 22, paddingVertical: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowLabel: { fontSize: 15 },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rangeField: { flex: 1 },
  dateLabel: { fontSize: 12, opacity: 0.6, marginBottom: 2 },
  chipRow: { gap: 8, paddingVertical: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  newCategoryBox: { paddingVertical: 8 },
  swatchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 8 },
  swatch: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  categoryPanelActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20 },
  newCategoryConfirm: { paddingVertical: 8 },
  textFieldGroup: { paddingVertical: 8 },
  deleteRow: { alignItems: 'center', paddingVertical: 20, marginTop: 16 },
});
