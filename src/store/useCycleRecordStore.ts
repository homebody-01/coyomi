import { create } from 'zustand';

import { db } from '../db/client';
import type { CycleRecord } from '../types/models';

interface CycleRecordRow {
  id: string;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

function rowToCycleRecord(row: CycleRecordRow): CycleRecord {
  return {
    id: row.id,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sortByStartDate(records: CycleRecord[]): CycleRecord[] {
  return [...records].sort((a, b) => a.startDate.localeCompare(b.startDate));
}

interface CycleRecordState {
  cycleRecords: CycleRecord[];
  isLoaded: boolean;
  loadCycleRecords: () => Promise<void>;
  addCycleRecord: (record: CycleRecord) => Promise<void>;
  updateCycleRecord: (record: CycleRecord) => Promise<void>;
  deleteCycleRecord: (id: string) => Promise<void>;
}

export const useCycleRecordStore = create<CycleRecordState>()((set) => ({
  cycleRecords: [],
  isLoaded: false,
  loadCycleRecords: async () => {
    const rows = await db.getAllAsync<CycleRecordRow>(
      'SELECT * FROM cycle_records ORDER BY start_date ASC',
    );
    set({ cycleRecords: rows.map(rowToCycleRecord), isLoaded: true });
  },
  addCycleRecord: async (record) => {
    await db.runAsync(
      'INSERT INTO cycle_records (id, start_date, end_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      record.id,
      record.startDate,
      record.endDate,
      record.createdAt,
      record.updatedAt,
    );
    set((state) => ({ cycleRecords: sortByStartDate([...state.cycleRecords, record]) }));
  },
  updateCycleRecord: async (record) => {
    await db.runAsync(
      'UPDATE cycle_records SET start_date = ?, end_date = ?, updated_at = ? WHERE id = ?',
      record.startDate,
      record.endDate,
      record.updatedAt,
      record.id,
    );
    set((state) => ({
      cycleRecords: sortByStartDate(state.cycleRecords.map((r) => (r.id === record.id ? record : r))),
    }));
  },
  deleteCycleRecord: async (id) => {
    await db.runAsync('DELETE FROM cycle_records WHERE id = ?', id);
    set((state) => ({ cycleRecords: state.cycleRecords.filter((r) => r.id !== id) }));
  },
}));
