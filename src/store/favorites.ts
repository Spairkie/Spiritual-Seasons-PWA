import { getDb } from './db';
import { STORE_NAMES } from '@/types/store';
import type { FavoriteRecord } from '@/types/store';
import type { SeasonId } from '@/types/book';

export async function getFavorite(day: number): Promise<FavoriteRecord | undefined> {
  const db = await getDb();
  try {
    return await db.get(STORE_NAMES.FAVORITES, day);
  } catch {
    return undefined;
  }
}

/** Toggles existence, mirroring the legacy app: returns true if the day is
 * now favourited, false if this call just removed it. */
export async function toggleFavorite(
  day: number,
  season: SeasonId | undefined,
  scriptureRef: string,
  note = ''
): Promise<boolean> {
  const db = await getDb();
  const existing = await getFavorite(day);
  if (existing) {
    await db.delete(STORE_NAMES.FAVORITES, day);
    return false;
  }
  const record: FavoriteRecord = {
    day,
    scriptureRef,
    note: note || '',
    addedAt: new Date().toISOString(),
  };
  if (season !== undefined) record.season = season;
  await db.put(STORE_NAMES.FAVORITES, record);
  return true;
}

export async function updateFavoriteNote(day: number, note: string): Promise<boolean> {
  const existing = await getFavorite(day);
  if (!existing) return false;
  const db = await getDb();
  await db.put(STORE_NAMES.FAVORITES, {
    ...existing,
    note: note || '',
    updatedAt: new Date().toISOString(),
  });
  return true;
}

export async function getAllFavorites(): Promise<FavoriteRecord[]> {
  const db = await getDb();
  return db.getAll(STORE_NAMES.FAVORITES);
}

export async function isFavorite(day: number): Promise<boolean> {
  return !!(await getFavorite(day));
}
