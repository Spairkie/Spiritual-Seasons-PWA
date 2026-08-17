import { getDb } from './db';
import { STORE_NAMES } from '@/types/store';
import type { JournalEntry } from '@/types/store';
import type { SeasonId } from '@/types/book';

export async function getJournalEntry(day: number): Promise<JournalEntry | undefined> {
  const db = await getDb();
  return db.get(STORE_NAMES.JOURNAL, day);
}

export async function saveJournalEntry(
  day: number,
  content: string,
  season?: SeasonId
): Promise<void> {
  const db = await getDb();
  const existing = await db.get(STORE_NAMES.JOURNAL, day);
  const now = new Date().toISOString();
  const entry: JournalEntry = {
    day,
    content,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  if (season !== undefined) entry.season = season;
  await db.put(STORE_NAMES.JOURNAL, entry);
}

export async function getAllJournalEntries(): Promise<JournalEntry[]> {
  const db = await getDb();
  return db.getAll(STORE_NAMES.JOURNAL);
}

export async function getJournalEntriesBySeason(season: SeasonId): Promise<JournalEntry[]> {
  const db = await getDb();
  return db.getAllFromIndex(STORE_NAMES.JOURNAL, 'season', season);
}

export async function searchJournal(query: string): Promise<JournalEntry[]> {
  const entries = await getAllJournalEntries();
  if (!query) return entries;
  const lowerQuery = query.toLowerCase();
  return entries.filter((entry) => entry.content.toLowerCase().includes(lowerQuery));
}
