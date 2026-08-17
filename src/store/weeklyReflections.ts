import { getDb } from './db';
import { STORE_NAMES } from '@/types/store';
import type { WeeklyReflectionRecord } from '@/types/store';

export async function saveWeeklyReflection(
  reflection: Pick<WeeklyReflectionRecord, 'week'> &
    Partial<Pick<WeeklyReflectionRecord, 'questions' | 'responses' | 'createdAt'>>
): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAMES.WEEKLY_REFLECTIONS, {
    week: reflection.week,
    questions: reflection.questions ?? [],
    responses: reflection.responses ?? [],
    createdAt: reflection.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function getWeeklyReflection(
  week: number
): Promise<WeeklyReflectionRecord | undefined> {
  const db = await getDb();
  return db.get(STORE_NAMES.WEEKLY_REFLECTIONS, week);
}

export async function getAllWeeklyReflections(): Promise<WeeklyReflectionRecord[]> {
  const db = await getDb();
  return db.getAll(STORE_NAMES.WEEKLY_REFLECTIONS);
}

export async function deleteWeeklyReflection(week: number): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAMES.WEEKLY_REFLECTIONS, week);
}
