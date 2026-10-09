import type { DailyNote } from '../types/models';

export function isNoteEmpty(note: Pick<DailyNote, 'bodyTags' | 'moodTags' | 'text'>): boolean {
  return note.bodyTags.length === 0 && note.moodTags.length === 0 && !note.text;
}

/** A bare cycle-record day must never itself trigger this — only an actual note with content does. */
export function shouldShowNoteDot(date: string, notes: DailyNote[]): boolean {
  const note = notes.find((n) => n.date === date);
  return !!note && !isNoteEmpty(note);
}
