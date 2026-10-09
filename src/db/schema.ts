export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  color_hex TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  is_all_day INTEGER NOT NULL DEFAULT 0,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  location TEXT,
  memo TEXT,
  reminder_minutes_before INTEGER DEFAULT 30,
  recurrence_rule TEXT,
  excluded_dates TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_start_at ON events(start_at);
CREATE INDEX IF NOT EXISTS idx_events_end_at ON events(end_at);
CREATE INDEX IF NOT EXISTS idx_events_category_id ON events(category_id);

CREATE TABLE IF NOT EXISTS cycle_records (
  id TEXT PRIMARY KEY NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cycle_records_start_date ON cycle_records(start_date);

CREATE TABLE IF NOT EXISTS daily_notes (
  id TEXT PRIMARY KEY NOT NULL,
  date TEXT NOT NULL UNIQUE,
  body_tags TEXT NOT NULL DEFAULT '[]',
  mood_tags TEXT NOT NULL DEFAULT '[]',
  text TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  cycle_length_days INTEGER NOT NULL DEFAULT 28,
  period_length_days INTEGER NOT NULL DEFAULT 5,
  week_starts_on INTEGER NOT NULL DEFAULT 0,
  show_weekend_color INTEGER NOT NULL DEFAULT 1,
  weekend_color_mode TEXT NOT NULL DEFAULT 'redBlue',
  show_holidays INTEGER NOT NULL DEFAULT 1,
  show_forecast INTEGER NOT NULL DEFAULT 1
);
INSERT OR IGNORE INTO settings (id) VALUES (1);
`;
