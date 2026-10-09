import { create } from 'zustand';

import { db } from '../db/client';
import type { Settings } from '../types/models';

interface SettingsRow {
  cycle_length_days: number;
  period_length_days: number;
  week_starts_on: number;
  show_weekend_color: number;
  weekend_color_mode: Settings['weekendColorMode'];
  show_holidays: number;
  show_forecast: number;
}

function rowToSettings(row: SettingsRow): Settings {
  return {
    cycleLengthDays: row.cycle_length_days,
    periodLengthDays: row.period_length_days,
    weekStartsOn: row.week_starts_on as Settings['weekStartsOn'],
    showWeekendColor: row.show_weekend_color === 1,
    weekendColorMode: row.weekend_color_mode,
    showHolidays: row.show_holidays === 1,
    showForecast: row.show_forecast === 1,
  };
}

const DEFAULT_SETTINGS: Settings = {
  cycleLengthDays: 28,
  periodLengthDays: 5,
  weekStartsOn: 0,
  showWeekendColor: true,
  weekendColorMode: 'redBlue',
  showHolidays: true,
  showForecast: true,
};

const COLUMN_MAP: Record<keyof Settings, string> = {
  cycleLengthDays: 'cycle_length_days',
  periodLengthDays: 'period_length_days',
  weekStartsOn: 'week_starts_on',
  showWeekendColor: 'show_weekend_color',
  weekendColorMode: 'weekend_color_mode',
  showHolidays: 'show_holidays',
  showForecast: 'show_forecast',
};

function toColumnValue(value: Settings[keyof Settings]): string | number {
  return typeof value === 'boolean' ? (value ? 1 : 0) : value;
}

interface SettingsState {
  settings: Settings;
  isLoaded: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<Settings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  settings: DEFAULT_SETTINGS,
  isLoaded: false,
  loadSettings: async () => {
    const row = await db.getFirstAsync<SettingsRow>('SELECT * FROM settings WHERE id = 1');
    if (row) set({ settings: rowToSettings(row), isLoaded: true });
  },
  // Column-scoped writes: each call only ever touches the fields it was
  // asked to change, so concurrent updateSettings calls for DIFFERENT
  // fields (plausible from CalendarSettingsScreen's several toggles) can
  // never clobber each other regardless of which async write resolves
  // last. A rapid double-toggle of the SAME field just has the last call
  // win, which is the correct "final tap decides" behavior.
  updateSettings: async (partial) => {
    const keys = Object.keys(partial) as (keyof Settings)[];
    if (keys.length === 0) return;
    const setClause = keys.map((key) => `${COLUMN_MAP[key]} = ?`).join(', ');
    const values = keys.map((key) => toColumnValue(partial[key] as Settings[keyof Settings]));
    await db.runAsync(`UPDATE settings SET ${setClause} WHERE id = 1`, ...values);
    set((state) => ({ settings: { ...state.settings, ...partial } }));
  },
}));
