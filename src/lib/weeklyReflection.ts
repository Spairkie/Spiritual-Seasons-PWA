import * as store from '@/store';
import { REFLECTION_FREQUENCY } from '@/content/weeklyReflectionQuestions';

/** Mirrors legacy WeeklyReflection.isReflectionDue: due when the user has
 * just crossed a multiple-of-7 completed-days milestone and hasn't already
 * saved a reflection for that week. Based on completed-day count, not the
 * current day number, so skipping around doesn't skip reflections. */
export async function checkReflectionDue(): Promise<number | null> {
  const completedCount = await store.getCompletedDaysCount();
  if (completedCount < REFLECTION_FREQUENCY) return null;
  if (completedCount % REFLECTION_FREQUENCY !== 0) return null;

  const week = Math.floor(completedCount / REFLECTION_FREQUENCY);
  const existing = await store.getWeeklyReflection(week);
  return existing ? null : week;
}
