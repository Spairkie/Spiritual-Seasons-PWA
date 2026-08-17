import { getDb } from './db';
import { STORE_NAMES } from '@/types/store';
import type { StreakRecord, Streak } from '@/types/store';
import { getAllProgress } from './progress';

/** Matches legacy CONFIG.PROGRESS.STREAK_GRACE_PERIOD_HOURS. */
const STREAK_GRACE_PERIOD_HOURS = 24;

export async function getStreakData(): Promise<StreakRecord> {
  const db = await getDb();
  const data = await db.get(STORE_NAMES.STREAKS, 'current');
  return (
    data ?? {
      id: 'current',
      currentStreak: 0,
      longestStreak: 0,
      lastCompletedDate: null,
      milestones: [],
      updatedAt: new Date().toISOString(),
    }
  );
}

export async function updateStreakData(streakData: Partial<StreakRecord>): Promise<void> {
  const db = await getDb();
  const current = await getStreakData();
  await db.put(STORE_NAMES.STREAKS, {
    ...current,
    ...streakData,
    id: 'current',
    updatedAt: new Date().toISOString(),
  });
}

export async function getStreak(): Promise<Streak> {
  const streakData = await getStreakData();
  return {
    current: streakData.currentStreak || 0,
    longest: streakData.longestStreak || 0,
    lastCompletedDate: streakData.lastCompletedDate || null,
  };
}

/** Day difference at local midnight, so DST transitions don't skew streaks. */
function getDayDifference(date1: Date | string, date2: Date | string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  const diffTime = d1.getTime() - d2.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export async function calculateStreak(): Promise<{
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null;
}> {
  const progress = await getAllProgress();
  const completedDays = progress
    .filter((p) => p.completed)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

  if (completedDays.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastCompletedDate: null };
  }

  let currentStreak = 0;
  let longestStreak = 0;
  const firstEntry = completedDays[0]!;
  const lastCompletionDate = new Date(firstEntry.completedAt);

  const now = new Date();
  const hoursSinceLastCompletion = (now.getTime() - lastCompletionDate.getTime()) / (1000 * 60 * 60);

  if (hoursSinceLastCompletion <= STREAK_GRACE_PERIOD_HOURS) {
    currentStreak = 1;
    let previousDate = lastCompletionDate;
    for (let i = 1; i < completedDays.length; i++) {
      const currentDate = new Date(completedDays[i]!.completedAt);
      const dayDiff = getDayDifference(previousDate, currentDate);
      if (dayDiff === 1) {
        currentStreak++;
        previousDate = currentDate;
      } else if (dayDiff === 0) {
        continue;
      } else {
        break;
      }
    }
  } else {
    currentStreak = 0;
  }

  let tempStreak = 1;
  let previousDate = lastCompletionDate;
  for (let i = 1; i < completedDays.length; i++) {
    const currentDate = new Date(completedDays[i]!.completedAt);
    const dayDiff = getDayDifference(previousDate, currentDate);
    if (dayDiff === 1) {
      tempStreak++;
    } else if (dayDiff === 0) {
      continue;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
    previousDate = currentDate;
  }
  longestStreak = Math.max(longestStreak, tempStreak);
  longestStreak = Math.max(longestStreak, currentStreak);

  return { currentStreak, longestStreak, lastCompletedDate: firstEntry.completedAt };
}

export async function updateStreak(): Promise<{ current: number; longest: number }> {
  const calculated = await calculateStreak();
  await updateStreakData(calculated);
  return { current: calculated.currentStreak, longest: calculated.longestStreak };
}

export async function recomputeStreak(): Promise<{ current: number; longest: number }> {
  return updateStreak();
}

export async function getWeekProgress(): Promise<number> {
  const progress = await getAllProgress();
  const completedDays = progress.filter((p) => p.completed);
  if (completedDays.length === 0) return 0;

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  endOfWeek.setHours(0, 0, 0, 0);

  return completedDays.filter((day) => {
    const completedDate = new Date(day.completedAt);
    return completedDate >= startOfWeek && completedDate < endOfWeek;
  }).length;
}
