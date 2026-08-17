/** Public store API. Domain logic lives in the sibling modules; this file
 * only adds init()/isReady() and composes the one cross-domain operation
 * (removing a progress record also recomputes the streak) to avoid a
 * progress <-> streaks import cycle. */

import { getDb } from './db';
import * as progress from './progress';
import { recomputeStreak } from './streaks';

export * from './user';
export * from './journal';
export {
  getDayProgress,
  markDayComplete,
  getAllProgress,
  getCompletedDays,
  getCompletedDaysCount,
  getSeasonProgress,
} from './progress';
export * from './favorites';
export * from './settings';
export * from './audioNotes';
export * from './weeklyReflections';
export * from './streaks';
export * from './dataTransfer';

let ready = false;

export async function init(): Promise<void> {
  await getDb();
  ready = true;
}

export function isReady(): boolean {
  return ready;
}

export async function markDayIncomplete(day: number): Promise<void> {
  await progress.deleteDayProgress(day);
  await recomputeStreak();
}
