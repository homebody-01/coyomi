import { Ionicons } from '@expo/vector-icons';
import { BottomSheet, BottomSheetScrollView } from '@expo/ui/community/bottom-sheet';
import { addDays, format, startOfDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { isNoteEmpty } from '../domain/dailyNote';
import { occurrencesInRange, sortDayEvents } from '../domain/recurrence';
import { useTokens } from '../theme/tokens';
import type { Category, DailyNote, Event } from '../types/models';

function formatDuration(startAt: string, endAt: string): string {
  const totalMinutes = Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours}時間${minutes}分`;
  if (hours > 0) return `${hours}時間`;
  return `${minutes}分`;
}

interface DayDetailSheetProps {
  selectedDate: Date | null;
  events: Event[];
  categories: Category[];
  notes: DailyNote[];
  onChangeDate: (date: Date) => void;
  onClose: () => void;
  onAddEvent: (date: Date) => void;
  onEditEvent: (eventId: string, occurrenceDate: Date) => void;
  onOpenNote: (date: Date) => void;
}

export function DayDetailSheet({
  selectedDate,
  events,
  categories,
  notes,
  onChangeDate,
  onClose,
  onAddEvent,
  onEditEvent,
  onOpenNote,
}: DayDetailSheetProps) {
  const tokens = useTokens();

  const dayEvents = useMemo(() => {
    if (!selectedDate) return [];
    const day = startOfDay(selectedDate);
    const matches = events.filter((event) => occurrencesInRange(event, { start: day, end: day }).length > 0);
    return sortDayEvents(matches);
  }, [events, selectedDate]);

  const currentNote = useMemo(() => {
    if (!selectedDate) return undefined;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return notes.find((n) => n.date === dateStr);
  }, [notes, selectedDate]);
  const hasNoteContent = !!currentNote && !isNoteEmpty(currentNote);

  return (
    <BottomSheet
      index={selectedDate ? 0 : -1}
      onClose={onClose}
      enableDynamicSizing
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: tokens.color.paper }}
    >
      <BottomSheetScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        {selectedDate && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Text style={{ fontFamily: tokens.font.family, fontSize: 22, fontWeight: '700', color: tokens.color.ink }}>
                  {format(selectedDate, 'd')}
                </Text>
                <Text style={{ fontFamily: tokens.font.family, fontSize: 14, color: tokens.color.ink, opacity: 0.6 }}>
                  {format(selectedDate, 'EEEE', { locale: ja })}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
                <Pressable onPress={() => onChangeDate(addDays(selectedDate, -1))} hitSlop={12}>
                  <Ionicons name="chevron-back" size={18} color={tokens.color.ink} />
                </Pressable>
                <Pressable onPress={() => onChangeDate(addDays(selectedDate, 1))} hitSlop={12}>
                  <Ionicons name="chevron-forward" size={18} color={tokens.color.ink} />
                </Pressable>
              </View>
            </View>

            {dayEvents.map((event) => {
              const category = categories.find((c) => c.id === event.categoryId);
              const color = category?.colorHex ?? tokens.color.ink;

              if (event.isAllDay) {
                return (
                  <Pressable
                    key={event.id}
                    onPress={() => onEditEvent(event.id, selectedDate)}
                    style={{ paddingVertical: 4 }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        backgroundColor: color,
                        borderRadius: tokens.radius.card,
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                      }}
                    >
                      <Text style={{ fontFamily: tokens.font.family, fontSize: 12, color: tokens.color.paper, opacity: 0.85 }}>
                        終日
                      </Text>
                      <Text style={{ flex: 1, fontFamily: tokens.font.family, fontSize: 15, color: tokens.color.paper }}>
                        {event.title}
                      </Text>
                    </View>
                  </Pressable>
                );
              }

              const durationText = formatDuration(event.startAt, event.endAt);
              const subtitle = event.location ? `${event.location}・${durationText}` : durationText;

              return (
                <Pressable
                  key={event.id}
                  onPress={() => onEditEvent(event.id, selectedDate)}
                  style={{ flexDirection: 'row', paddingVertical: 8, gap: 12 }}
                >
                  <View style={{ width: 48 }}>
                    <Text style={{ fontFamily: tokens.font.family, fontSize: 13, color: tokens.color.ink }}>
                      {format(new Date(event.startAt), 'HH:mm')}
                    </Text>
                    <Text
                      style={{
                        fontFamily: tokens.font.family,
                        fontSize: 13,
                        color: tokens.color.ink,
                        opacity: 0.5,
                        marginTop: 2,
                      }}
                    >
                      {format(new Date(event.endAt), 'HH:mm')}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: tokens.font.family, fontSize: 15, color: tokens.color.ink }}>
                      {event.title}
                    </Text>
                    <Text
                      style={{
                        fontFamily: tokens.font.family,
                        fontSize: 12,
                        color: tokens.color.ink,
                        opacity: 0.5,
                        marginTop: 2,
                      }}
                    >
                      {subtitle}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: color,
                      marginTop: 5,
                    }}
                  />
                </Pressable>
              );
            })}

            <Pressable
              onPress={() => onOpenNote(selectedDate)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 8,
                marginTop: 4,
              }}
            >
              <Text style={{ color: tokens.color.ink, fontFamily: tokens.font.family, fontSize: 15 }}>体調メモ</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ color: tokens.color.ink, opacity: 0.6, fontFamily: tokens.font.family, fontSize: 15 }}>
                  {hasNoteContent ? 'あり' : 'なし'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={`${tokens.color.ink}66`} />
              </View>
            </Pressable>

            <Pressable
              onPress={() => onAddEvent(selectedDate)}
              style={{
                marginTop: 16,
                backgroundColor: tokens.color.ink,
                borderRadius: tokens.radius.card,
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: tokens.color.paper, fontFamily: tokens.font.family, fontSize: 15 }}>
                予定を追加
              </Text>
            </Pressable>
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
