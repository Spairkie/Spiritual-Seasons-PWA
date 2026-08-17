import { beforeEach, describe, expect, it } from 'vitest';
import { resetDb } from './testUtils';
import * as store from '@/store';

beforeEach(async () => {
  await resetDb();
  await store.init();
});

describe('user', () => {
  it('returns undefined before any profile is saved', async () => {
    expect(await store.getUser()).toBeUndefined();
    expect(await store.getCurrentDay()).toBe(1);
    expect(await store.getCurrentSeason()).toBeNull();
  });

  it('persists current season and day independently', async () => {
    await store.setCurrentSeason('spring');
    await store.setCurrentDay(12);
    const user = await store.getUser();
    expect(user?.currentSeason).toBe('spring');
    expect(user?.currentDay).toBe(12);
  });

  it('keeps quiz results separate from the profile record', async () => {
    await store.setCurrentSeason('summer');
    await store.saveQuizResults({ winningSeason: 'summer' } as never);
    const user = await store.getUser();
    const quiz = await store.getQuizResults();
    expect(user?.currentSeason).toBe('summer');
    expect((quiz as never as { winningSeason: string })?.winningSeason).toBe('summer');
  });
});

describe('journal', () => {
  it('preserves createdAt across edits and updates updatedAt', async () => {
    await store.saveJournalEntry(1, 'first draft', 'winter');
    const first = await store.getJournalEntry(1);
    expect(first?.content).toBe('first draft');

    await store.saveJournalEntry(1, 'revised', 'winter');
    const second = await store.getJournalEntry(1);
    expect(second?.content).toBe('revised');
    expect(second?.createdAt).toBe(first?.createdAt);
  });

  it('filters by season via the season index', async () => {
    await store.saveJournalEntry(1, 'a', 'winter');
    await store.saveJournalEntry(31, 'b', 'spring');
    const winterEntries = await store.getJournalEntriesBySeason('winter');
    expect(winterEntries.map((e) => e.day)).toEqual([1]);
  });

  it('searchJournal is case-insensitive and returns everything for an empty query', async () => {
    await store.saveJournalEntry(1, 'Grace and Peace', 'winter');
    expect(await store.searchJournal('grace')).toHaveLength(1);
    expect(await store.searchJournal('nomatch')).toHaveLength(0);
    expect(await store.searchJournal('')).toHaveLength(1);
  });
});

describe('progress + streaks', () => {
  it('marks a day complete and recomputes the streak on incomplete', async () => {
    await store.markDayComplete(1, 'winter');
    expect(await store.getCompletedDaysCount()).toBe(1);

    await store.markDayIncomplete(1);
    expect(await store.getCompletedDaysCount()).toBe(0);
    const streak = await store.getStreak();
    expect(streak.current).toBe(0);
  });

  it('computes a current streak across consecutive days', async () => {
    const db = await (await import('@/store/db')).getDb();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2);

    await db.put('progress', { day: 1, completed: true, completedAt: twoDaysAgo.toISOString() });
    await db.put('progress', { day: 2, completed: true, completedAt: yesterday.toISOString() });
    await db.put('progress', { day: 3, completed: true, completedAt: today.toISOString() });

    const result = await store.updateStreak();
    expect(result.current).toBe(3);
    expect(result.longest).toBe(3);
  });
});

describe('favorites', () => {
  it('toggles on then off', async () => {
    expect(await store.toggleFavorite(5, 'winter', 'John 3:16')).toBe(true);
    expect(await store.isFavorite(5)).toBe(true);
    expect(await store.toggleFavorite(5, 'winter', 'John 3:16')).toBe(false);
    expect(await store.isFavorite(5)).toBe(false);
  });

  it('updates a note on an existing favorite only', async () => {
    expect(await store.updateFavoriteNote(9, 'no favorite yet')).toBe(false);
    await store.toggleFavorite(9, 'winter', 'Ps 23:1');
    expect(await store.updateFavoriteNote(9, 'a note')).toBe(true);
    const fav = await store.getFavorite(9);
    expect(fav?.note).toBe('a note');
  });
});

describe('settings', () => {
  it('returns defaults with nothing stored', async () => {
    const settings = await store.getSettings();
    expect(settings).toEqual(store.DEFAULT_SETTINGS);
  });

  it('merges partial saves over the current settings', async () => {
    await store.saveSetting('darkMode', 'dark');
    const settings = await store.getSettings();
    expect(settings.darkMode).toBe('dark');
    expect(settings.fontSize).toBe('medium');
  });

  it('resetSettings restores every field to default', async () => {
    await store.saveSettings({ darkMode: 'dark', fontSize: 'large' });
    await store.resetSettings();
    expect(await store.getSettings()).toEqual(store.DEFAULT_SETTINGS);
  });
});

describe('export / import round trip', () => {
  it('reproduces journal, progress, and favorites after a full round trip', async () => {
    await store.saveJournalEntry(1, 'exported entry', 'winter');
    await store.markDayComplete(1, 'winter');
    await store.toggleFavorite(1, 'winter', 'John 1:1');
    await store.saveSetting('darkMode', 'dark');

    const exported = await store.exportAllData();
    await store.resetAllData();
    expect(await store.getAllJournalEntries()).toHaveLength(0);

    const result = await store.importData(exported);
    expect(result.success).toBe(true);

    const entries = await store.getAllJournalEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.content).toBe('exported entry');
    expect(await store.getCompletedDaysCount()).toBe(1);
    expect(await store.isFavorite(1)).toBe(true);
  });

  it('rejects import data with an out-of-range journal day', async () => {
    const result = await store.importData({ journal: [{ day: 999, content: 'x' }] });
    expect(result.success).toBe(false);
  });
});
