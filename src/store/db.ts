/** Opens the same physical IndexedDB database the legacy app used
 * (spiritual-seasons-db, v1) with an identical store/index layout, so
 * existing users' data is read straight through with no migration step. */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { DB_NAME, DB_VERSION, STORE_NAMES } from '@/types/store';
import type {
  UserRecord,
  JournalEntry,
  ProgressRecord,
  FavoriteRecord,
  SettingsRecord,
  AudioNoteRecord,
  WeeklyReflectionRecord,
  StreakRecord,
} from '@/types/store';

export interface SpiritualSeasonsDB extends DBSchema {
  user: { key: string; value: UserRecord };
  journal: { key: number; value: JournalEntry; indexes: { season: string; updatedAt: string } };
  progress: { key: number; value: ProgressRecord; indexes: { completedAt: string } };
  favorites: { key: number; value: FavoriteRecord };
  settings: { key: string; value: SettingsRecord };
  audioNotes: {
    key: number;
    value: AudioNoteRecord;
    indexes: { createdAt: string; duration: number };
  };
  weeklyReflections: { key: number; value: WeeklyReflectionRecord; indexes: { createdAt: string } };
  streaks: { key: string; value: StreakRecord };
}

let dbPromise: Promise<IDBPDatabase<SpiritualSeasonsDB>> | null = null;
let dbInstance: IDBPDatabase<SpiritualSeasonsDB> | null = null;

export function getDb(): Promise<IDBPDatabase<SpiritualSeasonsDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SpiritualSeasonsDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains(STORE_NAMES.USER)) {
            db.createObjectStore(STORE_NAMES.USER, { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains(STORE_NAMES.JOURNAL)) {
            const journalStore = db.createObjectStore(STORE_NAMES.JOURNAL, { keyPath: 'day' });
            journalStore.createIndex('season', 'season', { unique: false });
            journalStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          }
          if (!db.objectStoreNames.contains(STORE_NAMES.PROGRESS)) {
            const progressStore = db.createObjectStore(STORE_NAMES.PROGRESS, { keyPath: 'day' });
            progressStore.createIndex('completedAt', 'completedAt', { unique: false });
          }
          if (!db.objectStoreNames.contains(STORE_NAMES.FAVORITES)) {
            db.createObjectStore(STORE_NAMES.FAVORITES, { keyPath: 'day' });
          }
          if (!db.objectStoreNames.contains(STORE_NAMES.SETTINGS)) {
            db.createObjectStore(STORE_NAMES.SETTINGS, { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains(STORE_NAMES.AUDIO_NOTES)) {
            const audioStore = db.createObjectStore(STORE_NAMES.AUDIO_NOTES, { keyPath: 'day' });
            audioStore.createIndex('createdAt', 'createdAt', { unique: false });
            audioStore.createIndex('duration', 'duration', { unique: false });
          }
          if (!db.objectStoreNames.contains(STORE_NAMES.WEEKLY_REFLECTIONS)) {
            const reflectionStore = db.createObjectStore(STORE_NAMES.WEEKLY_REFLECTIONS, {
              keyPath: 'week',
            });
            reflectionStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
          if (!db.objectStoreNames.contains(STORE_NAMES.STREAKS)) {
            db.createObjectStore(STORE_NAMES.STREAKS, { keyPath: 'id' });
          }
        }
      },
    });
    dbPromise.then((db) => {
      dbInstance = db;
    });
  }
  return dbPromise;
}

/** Test-only escape hatch: closes any open connection and forces the next
 * getDb() call to reopen, so indexedDB.deleteDatabase() isn't left blocked
 * waiting for this module's connection to close. */
export function _resetDbForTests(): void {
  dbInstance?.close();
  dbInstance = null;
  dbPromise = null;
}
