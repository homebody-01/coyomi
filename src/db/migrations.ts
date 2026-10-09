import type { SQLiteDatabase } from 'expo-sqlite';

import { SCHEMA_SQL } from './schema';

const DATABASE_VERSION = 3;

export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentDbVersion = result?.user_version ?? 0;
  if (currentDbVersion >= DATABASE_VERSION) return;

  if (currentDbVersion === 0) {
    // SCHEMA_SQL always reflects the latest shape (mood_tags included), so a
    // fresh install lands directly on DATABASE_VERSION with nothing left for
    // the version-1-specific migration below to do.
    await db.execAsync(SCHEMA_SQL);
    currentDbVersion = DATABASE_VERSION;
  }

  if (currentDbVersion === 1) {
    // v1 stored mood as a single nullable `mood_tag` column; v2 moved it to
    // multi-select `mood_tags` (JSON array), matching how `body_tags` already
    // worked. Existing rows carry their old single value forward as a
    // one-element array instead of losing it.
    await db.execAsync("ALTER TABLE daily_notes ADD COLUMN mood_tags TEXT NOT NULL DEFAULT '[]'");
    const rows = await db.getAllAsync<{ id: string; mood_tag: string | null }>(
      'SELECT id, mood_tag FROM daily_notes WHERE mood_tag IS NOT NULL',
    );
    for (const row of rows) {
      await db.runAsync('UPDATE daily_notes SET mood_tags = ? WHERE id = ?', JSON.stringify([row.mood_tag]), row.id);
    }
    await db.execAsync('ALTER TABLE daily_notes DROP COLUMN mood_tag');
    currentDbVersion = 2;
  }

  if (currentDbVersion === 2) {
    // Lets a recurring event's series be deleted per-occurrence ("この予定の
    // み削除") instead of only as a whole — deleting one occurrence adds its
    // date here rather than touching the event row itself.
    await db.execAsync("ALTER TABLE events ADD COLUMN excluded_dates TEXT NOT NULL DEFAULT '[]'");
    currentDbVersion = 3;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
