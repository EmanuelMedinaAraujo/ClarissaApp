import type { SQLiteDatabase } from 'expo-sqlite';
import * as SQLite from 'expo-sqlite';
import { BloodFlow, createSymptomBitmask, decodeSymptomBitmask, Entry, SymptomKey, toLocalDateKey } from '../models/menstruation';

// Notes:
// - expo-sqlite supports Web via a wasm shim in SDK 53+, but we still guard JSON parsing/stringifying.
// - Store notes single string.
// - symptoms bitmask as INTEGER NULL.
// - date TEXT (YYYY-MM-DD) UNIQUE.
// - Keep an autoincrement primary key for internal order if needed, but requirement says 5 columns.
//   We'll keep exactly the 5 specified columns and enforce ordering by date in queries.

const DB_NAME = 'clarissa.db';
const TABLE_NAME = 'entries';
const PILL_CONFIG_TABLE = 'pill_config';

type Row = {
  date: string;
  pill_taken: number; // 0/1
  blood_flow: number; // enum 0..3
  symptoms: number | null; // 0..65535 or null
  notes: string | null; // single note string
};

async function migrate(db: SQLiteDatabase) {
  // Create table with the exact five columns requested.
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      date TEXT NOT NULL UNIQUE,
      pill_taken INTEGER NOT NULL DEFAULT 0,
      blood_flow INTEGER NOT NULL DEFAULT 0,
      symptoms INTEGER,
      notes TEXT
    );
  `);

  // Index for ordering by date if needed
  await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_${TABLE_NAME}_date ON ${TABLE_NAME}(date);`);

  // Pill config (single row table)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ${PILL_CONFIG_TABLE} (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      cycle_length INTEGER NOT NULL DEFAULT 21,
      break_length INTEGER NOT NULL DEFAULT 7,
      first_pill_date TEXT
    );
  `);
  // Ensure singleton row exists
  await db.execAsync(`INSERT OR IGNORE INTO ${PILL_CONFIG_TABLE} (id, cycle_length, break_length, first_pill_date) VALUES (1, 21, 7, NULL);`);
}

function rowToEntry(row: Row): Entry {
  return {
    date: row.date,
    pillTaken: !!row.pill_taken,
    bloodFlow: (row.blood_flow ?? 0) as BloodFlow,
    symptoms: typeof row.symptoms === 'number' ? decodeSymptomBitmask(row.symptoms) : undefined,
    notes: row.notes ?? undefined,
  };
}

// Storage service interface (method names as requested)
export interface StorageService {
  loadAllEntries(): Promise<Entry[]>;
  getEntryByData(date: Date | string): Promise<Entry | null>;
  listEntriesInRange(start: Date | string, end: Date | string): Promise<Entry[]>;
  recordPillIntake(date: Date | string, taken?: boolean): Promise<void>;
  recordBloodFlow(date: Date | string, blood_flow: BloodFlow): Promise<void>;
  recordSymptom(date: Date | string, symptoms: SymptomKey[]): Promise<void>;
  recordNote(date: Date | string, note: string): Promise<void>;
  addOrUpdateEntry(entry: Entry): Promise<void>;
  // Pill cycle config
  getPillConfig(): Promise<PillConfig>;
  savePillConfig(cfg: PillConfig): Promise<void>;
}

export type PillConfig = {
  cycleLength: number; // active pill days in a cycle (e.g., 21)
  breakLength: number; // break days (e.g., 7)
  firstPillDate: string | null; // YYYY-MM-DD of first pill day in the model
};

async function init(): Promise<SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await migrate(db);
  return db;
}

export async function createSQLiteStorage(): Promise<StorageService & { getEntryByDate: StorageService['getEntryByData'] }> {
  const db = await init();

  return {
    async loadAllEntries(): Promise<Entry[]> {
      const rows = await db.getAllAsync<Row>(`SELECT date, pill_taken, blood_flow, symptoms, notes FROM ${TABLE_NAME} ORDER BY date ASC`);
      return rows.map(rowToEntry);
    },

    async getEntryByData(date: Date | string): Promise<Entry | null> {
      const key = toLocalDateKey(date);
      const rows = await db.getAllAsync<Row>(`SELECT date, pill_taken, blood_flow, symptoms, notes FROM ${TABLE_NAME} WHERE date = ? LIMIT 1`, [key]);
      if (!rows.length) return null;
      return rowToEntry(rows[0]);
    },

    async listEntriesInRange(start: Date | string, end: Date | string): Promise<Entry[]> {
      const s = toLocalDateKey(start);
      const e = toLocalDateKey(end);
      const rows = await db.getAllAsync<Row>(`SELECT date, pill_taken, blood_flow, symptoms, notes FROM ${TABLE_NAME} WHERE date BETWEEN ? AND ? ORDER BY date ASC`, [s, e]);
      return rows.map(rowToEntry);
    },

    async recordPillIntake(date: Date | string, taken: boolean = true): Promise<void> {
      const key = toLocalDateKey(date);
      const pillVal = taken ? 1 : 0;
      await db.runAsync(`INSERT INTO ${TABLE_NAME} (date, pill_taken) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET pill_taken = excluded.pill_taken`, [key, pillVal]);
    },

    async recordBloodFlow(date: Date | string, blood_flow: BloodFlow): Promise<void> {
      const key = toLocalDateKey(date);
      const flowVal = Number(blood_flow);
      await db.runAsync(`INSERT INTO ${TABLE_NAME} (date, blood_flow) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET blood_flow = excluded.blood_flow`, [key, flowVal]);
    },

    async recordSymptom(date: Date | string, symptoms: SymptomKey[]): Promise<void> {
      const key = toLocalDateKey(date);
      const v = Math.max(0, Math.min(0xffff, createSymptomBitmask(symptoms)));
      await db.runAsync(`INSERT INTO ${TABLE_NAME} (date, symptoms) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET symptoms = excluded.symptoms`, [key, v]);
    },

    async recordNote(date: Date | string, note: string): Promise<void> {
      const key = toLocalDateKey(date);
      await db.runAsync(`INSERT INTO ${TABLE_NAME} (date, notes) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET notes = excluded.notes`, [key, note]);
    },

    async addOrUpdateEntry(entry: Entry): Promise<void> {
      const key = toLocalDateKey(entry.date);
      const symptomsBitmask = entry.symptoms ? createSymptomBitmask(entry.symptoms) : null;
      await db.runAsync(
        `INSERT INTO ${TABLE_NAME} (date, pill_taken, blood_flow, symptoms, notes)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(date) DO UPDATE SET
           pill_taken = excluded.pill_taken,
           blood_flow = excluded.blood_flow,
           symptoms = excluded.symptoms,
           notes = excluded.notes`,
        [
          key,
          entry.pillTaken ? 1 : 0,
          Number(entry.bloodFlow ?? 0),
          symptomsBitmask,
          entry.notes ?? null,
        ]
      );
    },

    async getPillConfig(): Promise<PillConfig> {
      const rows = await db.getAllAsync<{ id: number; cycle_length: number; break_length: number; first_pill_date: string | null }>(
        `SELECT id, cycle_length, break_length, first_pill_date FROM ${PILL_CONFIG_TABLE} WHERE id = 1`
      );
      if (!rows.length) {
        return { cycleLength: 21, breakLength: 7, firstPillDate: null };
      }
      const r = rows[0];
      return {
        cycleLength: Math.max(1, Number(r.cycle_length ?? 21)),
        breakLength: Math.max(0, Number(r.break_length ?? 7)),
        firstPillDate: r.first_pill_date ?? null,
      };
    },

    async savePillConfig(cfg: PillConfig): Promise<void> {
      const cycle = Math.max(1, Math.floor(cfg.cycleLength));
      const brk = Math.max(0, Math.floor(cfg.breakLength));
      const first = cfg.firstPillDate ? toLocalDateKey(cfg.firstPillDate) : null;
      await db.runAsync(
        `INSERT INTO ${PILL_CONFIG_TABLE} (id, cycle_length, break_length, first_pill_date)
         VALUES (1, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           cycle_length = excluded.cycle_length,
           break_length = excluded.break_length,
           first_pill_date = excluded.first_pill_date`,
        [cycle, brk, first]
      );
    },
    // Back-compat: also expose the correct-spelled variant for convenience
    get getEntryByDate() {
      return this.getEntryByData.bind(this);
    },
  } as StorageService & { getEntryByDate: StorageService['getEntryByData'] };
}

export type { Entry };

