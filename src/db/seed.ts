import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { light } from '../theme/tokens';

// The design doc doesn't assign which of the 9 category colors goes to which
// default category — this mapping is an arbitrary, easily-changeable first pass.
const DEFAULT_CATEGORIES = [
  { name: '仕事', colorIndex: 0, order: 0 }, // category[0] '#4A6B63'
  { name: 'プライベート', colorIndex: 1, order: 1 }, // category[1] '#8A5A46'
  { name: '学び', colorIndex: 2, order: 2 }, // category[2] '#3F6C8E'
] as const;

export async function seedDefaultCategoriesIfEmpty(db: SQLiteDatabase): Promise<void> {
  const existing = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories',
  );
  if ((existing?.count ?? 0) > 0) return;

  for (const category of DEFAULT_CATEGORIES) {
    await db.runAsync(
      'INSERT INTO categories (id, name, color_hex, is_default, sort_order) VALUES (?, ?, ?, 1, ?)',
      Crypto.randomUUID(),
      category.name,
      light.color.category[category.colorIndex],
      category.order,
    );
  }
}
