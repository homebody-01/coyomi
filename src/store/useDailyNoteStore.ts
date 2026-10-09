import { create } from 'zustand';

import { db } from '../db/client';
import type { DailyNote } from '../types/models';

interface DailyNoteRow {
  id: string;
  date: string;
  body_tags: string;
  mood_tags: string;
  text: string | null;
  updated_at: string;
}

function rowToDailyNote(row: DailyNoteRow): DailyNote {
  return {
    id: row.id,
    date: row.date,
    bodyTags: JSON.parse(row.body_tags),
    moodTags: JSON.parse(row.mood_tags),
    text: row.text ?? undefined,
    updatedAt: row.updated_at,
  };
}

interface DailyNoteState {
  notes: DailyNote[];
  isLoaded: boolean;
  loadNotes: () => Promise<void>;
  saveNote: (note: DailyNote) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
}

export const useDailyNoteStore = create<DailyNoteState>()((set) => ({
  notes: [],
  isLoaded: false,
  loadNotes: async () => {
    const rows = await db.getAllAsync<DailyNoteRow>('SELECT * FROM daily_notes ORDER BY date ASC');
    set({ notes: rows.map(rowToDailyNote), isLoaded: true });
  },
  saveNote: async (note) => {
    await db.runAsync(
      `INSERT INTO daily_notes (id, date, body_tags, mood_tags, text, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET
         body_tags = excluded.body_tags,
         mood_tags = excluded.mood_tags,
         text = excluded.text,
         updated_at = excluded.updated_at`,
      note.id,
      note.date,
      JSON.stringify(note.bodyTags),
      JSON.stringify(note.moodTags),
      note.text ?? null,
      note.updatedAt,
    );
    set((state) => {
      const index = state.notes.findIndex((n) => n.date === note.date);
      if (index === -1) {
        return { notes: [...state.notes, note].sort((a, b) => a.date.localeCompare(b.date)) };
      }
      const next = [...state.notes];
      next[index] = note;
      return { notes: next };
    });
  },
  deleteNote: async (id) => {
    await db.runAsync('DELETE FROM daily_notes WHERE id = ?', id);
    set((state) => ({ notes: state.notes.filter((n) => n.id !== id) }));
  },
}));
