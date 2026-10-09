import { create } from 'zustand';

import { db } from '../db/client';
import type { Event } from '../types/models';

interface EventRow {
  id: string;
  title: string;
  is_all_day: number;
  start_at: string;
  end_at: string;
  category_id: string | null;
  location: string | null;
  memo: string | null;
  reminder_minutes_before: number | null;
  recurrence_rule: string | null;
  excluded_dates: string;
  created_at: string;
  updated_at: string;
}

function rowToEvent(row: EventRow): Event {
  return {
    id: row.id,
    title: row.title,
    isAllDay: row.is_all_day === 1,
    startAt: row.start_at,
    endAt: row.end_at,
    categoryId: row.category_id,
    location: row.location ?? undefined,
    memo: row.memo ?? undefined,
    reminderMinutesBefore: row.reminder_minutes_before ?? undefined,
    recurrenceRule: row.recurrence_rule ? JSON.parse(row.recurrence_rule) : null,
    excludedDates: JSON.parse(row.excluded_dates),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface EventState {
  events: Event[];
  isLoaded: boolean;
  loadEvents: () => Promise<void>;
  addEvent: (event: Event) => Promise<void>;
  updateEvent: (event: Event) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
}

export const useEventStore = create<EventState>()((set) => ({
  events: [],
  isLoaded: false,
  loadEvents: async () => {
    const rows = await db.getAllAsync<EventRow>('SELECT * FROM events ORDER BY start_at ASC');
    set({ events: rows.map(rowToEvent), isLoaded: true });
  },
  addEvent: async (event) => {
    await db.runAsync(
      `INSERT INTO events
       (id, title, is_all_day, start_at, end_at, category_id, location, memo,
        reminder_minutes_before, recurrence_rule, excluded_dates, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      event.id,
      event.title,
      event.isAllDay ? 1 : 0,
      event.startAt,
      event.endAt,
      event.categoryId,
      event.location ?? null,
      event.memo ?? null,
      event.reminderMinutesBefore ?? null,
      event.recurrenceRule ? JSON.stringify(event.recurrenceRule) : null,
      JSON.stringify(event.excludedDates),
      event.createdAt,
      event.updatedAt,
    );
    set((state) => ({ events: [...state.events, event] }));
  },
  updateEvent: async (event) => {
    await db.runAsync(
      `UPDATE events SET title = ?, is_all_day = ?, start_at = ?, end_at = ?, category_id = ?,
       location = ?, memo = ?, reminder_minutes_before = ?, recurrence_rule = ?, excluded_dates = ?, updated_at = ?
       WHERE id = ?`,
      event.title,
      event.isAllDay ? 1 : 0,
      event.startAt,
      event.endAt,
      event.categoryId,
      event.location ?? null,
      event.memo ?? null,
      event.reminderMinutesBefore ?? null,
      event.recurrenceRule ? JSON.stringify(event.recurrenceRule) : null,
      JSON.stringify(event.excludedDates),
      event.updatedAt,
      event.id,
    );
    set((state) => ({ events: state.events.map((e) => (e.id === event.id ? event : e)) }));
  },
  deleteEvent: async (id) => {
    await db.runAsync('DELETE FROM events WHERE id = ?', id);
    set((state) => ({ events: state.events.filter((e) => e.id !== id) }));
  },
}));
