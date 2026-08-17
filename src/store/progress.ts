import { getDb } from './db';
import { STORE_NAMES } from '@/types/store';
import type { ProgressRecord } from '@/types/store';
import type { SeasonId } from '@/types/book';

export async function getDayProgress(day: number): Promise<ProgressRecord | undefined> {
  const db = await getDb();
  return db.get(STORE_NAMES.PROGRESS, day);
}

export async function markDayComplete(day: number, season?: SeasonId): Promise<void> {
  const db = await getDb();
  const record: ProgressRecord = { day, completed: true, completedAt: new Date().toISOString() };
  if (season !== undefined) record.season = season;
  await db.put(STORE_NAMES.PROGRESS, record);
}

/** Removes the progress record only. Callers that need streak parity with
 * the legacy app's markDayIncomplete() must also call recomputeStreak() —
 * composed in store/index.ts to avoid a progress<->streaks import cycle. */
export async function deleteDayProgress(day: number): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAMES.PROGRESS, day);
}

export async function getAllProgress(): Promise<ProgressRecord[]> {
  const db = await getDb();
  return db.getAll(STORE_NAMES.PROGRESS);
}

export async function getCompletedDays(): Promise<number[]> {
  const progress = await getAllProgress();
  return progress.filter((p) => p.completed).map((p) => p.day);
}

export async function getCompletedDaysCount(): Promise<number> {
  const completed = await getCompletedDays();
  return completed.length;
}

export async function getSeasonProgress(season: SeasonId): Promise<ProgressRecord[]> {
  const allProgress = await getAllProgress();
  return allProgress.filter((p) => p.season === season && p.completed);
}
