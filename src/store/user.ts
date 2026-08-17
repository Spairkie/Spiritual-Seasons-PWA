import { getDb } from './db';
import { STORE_NAMES } from '@/types/store';
import type { UserProfileRecord, QuizResultsRecord } from '@/types/store';
import type { SeasonId } from '@/types/book';

export async function getUser(): Promise<UserProfileRecord | undefined> {
  const db = await getDb();
  const record = await db.get(STORE_NAMES.USER, 'profile');
  return record as UserProfileRecord | undefined;
}

export async function saveUser(
  userData: Partial<Omit<UserProfileRecord, 'key' | 'updatedAt'>>
): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAMES.USER, {
    ...userData,
    key: 'profile',
    updatedAt: new Date().toISOString(),
  });
}

export async function getQuizResults(): Promise<QuizResultsRecord | undefined> {
  const db = await getDb();
  const record = await db.get(STORE_NAMES.USER, 'quizResults');
  return record as QuizResultsRecord | undefined;
}

export async function saveQuizResults(
  results: Partial<Omit<QuizResultsRecord, 'key' | 'completedAt'>>
): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAMES.USER, {
    ...results,
    key: 'quizResults',
    completedAt: new Date().toISOString(),
  });
}

export async function getCurrentSeason(): Promise<SeasonId | null> {
  const user = await getUser();
  return user?.currentSeason ?? null;
}

export async function setCurrentSeason(season: SeasonId): Promise<void> {
  const user = (await getUser()) ?? ({} as UserProfileRecord);
  await saveUser({ ...user, currentSeason: season });
}

export async function getCurrentDay(): Promise<number> {
  const user = await getUser();
  return user?.currentDay ?? 1;
}

export async function setCurrentDay(day: number): Promise<void> {
  const user = (await getUser()) ?? ({} as UserProfileRecord);
  await saveUser({ ...user, currentDay: day });
}
