import * as Crypto from 'expo-crypto';
import { create } from 'zustand';

import { db } from '../db/client';
import { useEventStore } from './useEventStore';
import type { Category } from '../types/models';

interface CategoryRow {
  id: string;
  name: string;
  color_hex: string;
  is_default: number;
  sort_order: number;
}

function rowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    colorHex: row.color_hex,
    isDefault: row.is_default === 1,
    order: row.sort_order,
  };
}

interface CategoryState {
  categories: Category[];
  isLoaded: boolean;
  loadCategories: () => Promise<void>;
  addCategory: (input: { name: string; colorHex: string }) => Promise<Category>;
  updateCategory: (input: { id: string; name: string; colorHex: string }) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}

export const useCategoryStore = create<CategoryState>()((set, get) => ({
  categories: [],
  isLoaded: false,
  loadCategories: async () => {
    const rows = await db.getAllAsync<CategoryRow>('SELECT * FROM categories ORDER BY sort_order ASC');
    set({ categories: rows.map(rowToCategory), isLoaded: true });
  },
  addCategory: async ({ name, colorHex }) => {
    const category: Category = {
      id: Crypto.randomUUID(),
      name,
      colorHex,
      isDefault: false,
      order: get().categories.length,
    };
    await db.runAsync(
      'INSERT INTO categories (id, name, color_hex, is_default, sort_order) VALUES (?, ?, ?, 0, ?)',
      category.id,
      category.name,
      category.colorHex,
      category.order,
    );
    set((state) => ({ categories: [...state.categories, category] }));
    return category;
  },
  updateCategory: async ({ id, name, colorHex }) => {
    await db.runAsync('UPDATE categories SET name = ?, color_hex = ? WHERE id = ?', name, colorHex, id);
    set((state) => ({
      categories: state.categories.map((c) => (c.id === id ? { ...c, name, colorHex } : c)),
    }));
  },
  deleteCategory: async (id) => {
    // Foreign keys aren't PRAGMA-enabled on this connection, so the schema's
    // `ON DELETE SET NULL` is decorative — detach affected events ourselves,
    // then reload the event store so already-loaded events in memory drop
    // the reference too (categories.find(...) in the UI already tolerates a
    // null categoryId, rendering as uncategorized).
    await db.runAsync('UPDATE events SET category_id = NULL WHERE category_id = ?', id);
    await db.runAsync('DELETE FROM categories WHERE id = ?', id);
    set((state) => ({ categories: state.categories.filter((c) => c.id !== id) }));
    await useEventStore.getState().loadEvents();
  },
}));
