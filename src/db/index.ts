import { db } from './client';
import { migrateDbIfNeeded } from './migrations';
import { seedDefaultCategoriesIfEmpty } from './seed';

export async function initDatabase(): Promise<void> {
  await migrateDbIfNeeded(db);
  await seedDefaultCategoriesIfEmpty(db);
}
