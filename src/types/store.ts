/** IndexedDB schema types — verified line-by-line against legacy/js/store.js.
 * DB name/version and every store's keyPath/indexes MUST stay byte-identical
 * to the legacy schema below, or existing users' data becomes unreadable
 * (idb opens the same physical database, no migration path exists for v1). */

import type { SeasonId } from './book';

export const DB_NAME = 'spiritual-seasons-db';
export const DB_VERSION = 1;

export const STORE_NAMES = {
  USER: 'user',
  JOURNAL: 'journal',
  PROGRESS: 'progress',
  FAVORITES: 'favorites',
  SETTINGS: 'settings',
  AUDIO_NOTES: 'audioNotes',
  WEEKLY_REFLECTIONS: 'weeklyReflections',
  STREAKS: 'streaks',
} as const;

// ---- USER store (keyPath: 'key') — multiple keyed records, not one blob ----

export interface UserProfileRecord {
  key: 'profile';
  currentSeason?: SeasonId;
  currentDay?: number;
  updatedAt: string;
  [extra: string]: unknown;
}

export interface QuizResultsRecord {
  key: 'quizResults';
  completedAt: string;
  [extra: string]: unknown;
}

export type UserRecord = UserProfileRecord | QuizResultsRecord;

// ---- JOURNAL store (keyPath: 'day', indexes: season, updatedAt) ----

export interface JournalEntry {
  day: number;
  content: string;
  season?: SeasonId;
  createdAt: string;
  updatedAt: string;
}

// ---- PROGRESS store (keyPath: 'day', index: completedAt) ----

export interface ProgressRecord {
  day: number;
  season?: SeasonId;
  completed: true;
  completedAt: string;
}

// ---- FAVORITES store (keyPath: 'day') ----

export interface FavoriteRecord {
  day: number;
  season?: SeasonId;
  scriptureRef: string;
  note: string;
  addedAt: string;
  updatedAt?: string;
}

// ---- SETTINGS store (keyPath: 'key', single record key: 'app') ----

export interface Settings {
  bibleTranslation: string;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  lineSpacing: 'compact' | 'normal' | 'relaxed' | 'loose';
  darkMode: 'light' | 'dark' | 'system';
  seasonTheme: SeasonId | 'auto';
  notificationsEnabled: boolean;
  reminderTime: string;
  soundEnabled: boolean;
  autoSave: boolean;
  ttsRate: number;
  ambientSound: string;
  keyboardShortcuts: boolean;
  hapticsEnabled: boolean;
  onboardingCompleted: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  bibleTranslation: 'NLT',
  fontSize: 'medium',
  lineSpacing: 'normal',
  darkMode: 'light',
  seasonTheme: 'auto',
  notificationsEnabled: false,
  reminderTime: '08:00',
  soundEnabled: false,
  autoSave: true,
  ttsRate: 0.9,
  ambientSound: 'silence',
  keyboardShortcuts: true,
  hapticsEnabled: true,
  onboardingCompleted: false,
};

export interface SettingsRecord extends Settings {
  key: 'app';
}

// ---- AUDIO_NOTES store (keyPath: 'day', indexes: createdAt, duration) ----

export interface AudioNoteRecord {
  day: number;
  blob: Blob;
  duration: number;
  size: number;
  createdAt: string;
  updatedAt: string;
}

// ---- WEEKLY_REFLECTIONS store (keyPath: 'week', index: createdAt) ----

export interface WeeklyReflectionRecord {
  week: number; // 1-17
  questions: string[];
  responses: string[];
  createdAt: string;
  updatedAt: string;
}

// ---- STREAKS store (keyPath: 'id', single record id: 'current') ----

export interface StreakRecord {
  id: 'current';
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null;
  milestones: unknown[];
  updatedAt: string;
}

export interface Streak {
  current: number;
  longest: number;
  lastCompletedDate: string | null;
}

// ---- Export/import envelope (exportAllData / importData) ----

export interface DataExport {
  version: 1;
  exportedAt: string;
  user: UserProfileRecord | undefined;
  quizResults: QuizResultsRecord | undefined;
  journal: JournalEntry[];
  progress: ProgressRecord[];
  favorites: FavoriteRecord[];
  settings: Settings;
  audioNotes: AudioNoteRecord[];
  weeklyReflections: WeeklyReflectionRecord[];
  streaks: StreakRecord;
}

export interface ImportValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ImportResult {
  success: boolean;
  imported?: { journal: number; progress: number; favorites: number; audioNotes: number; reflections: number };
  errors?: string[];
  warnings?: string[];
  message: string;
}
