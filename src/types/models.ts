export interface Event {
  id: string;
  title: string;
  isAllDay: boolean;
  startAt: string; // ISO8601
  endAt: string; // ISO8601
  categoryId: string | null;
  location?: string;
  memo?: string;
  reminderMinutesBefore?: number;
  recurrenceRule?: { freq: 'daily' | 'weekly' | 'monthly' | 'yearly'; interval?: number } | null;
  excludedDates: string[]; // 'YYYY-MM-DD' occurrences of a recurring event deleted individually ("この予定のみ削除")
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  colorHex: string;
  isDefault: boolean;
  order: number;
}

export interface CycleRecord {
  id: string;
  startDate: string; // 'YYYY-MM-DD'
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MoodTag =
  | 'irritable'
  | 'anxious'
  | 'down'
  | 'restless'
  | 'unmotivated'
  | 'unfocused'
  | 'energetic'
  | 'calm'
  | 'motivated';

export interface DailyNote {
  id: string;
  date: string; // 'YYYY-MM-DD'
  bodyTags: string[];
  moodTags: MoodTag[];
  text?: string;
  updatedAt: string;
}

export interface Settings {
  cycleLengthDays: number;
  periodLengthDays: number;
  weekStartsOn: 0 | 1 | 6;
  showWeekendColor: boolean;
  weekendColorMode: 'redBlue' | 'shadeOnly';
  showHolidays: boolean;
  showForecast: boolean;
}
