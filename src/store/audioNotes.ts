import { getDb } from './db';
import { STORE_NAMES } from '@/types/store';
import type { AudioNoteRecord } from '@/types/store';

export async function saveAudioNote(
  audioData: Pick<AudioNoteRecord, 'day' | 'blob'> &
    Partial<Pick<AudioNoteRecord, 'duration' | 'size' | 'createdAt'>>
): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAMES.AUDIO_NOTES, {
    day: audioData.day,
    blob: audioData.blob,
    duration: audioData.duration ?? 0,
    size: audioData.size ?? 0,
    createdAt: audioData.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function getAudioNote(day: number): Promise<AudioNoteRecord | undefined> {
  const db = await getDb();
  return db.get(STORE_NAMES.AUDIO_NOTES, day);
}

export async function deleteAudioNote(day: number): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAMES.AUDIO_NOTES, day);
}

export async function getAllAudioNotes(): Promise<AudioNoteRecord[]> {
  const db = await getDb();
  return db.getAll(STORE_NAMES.AUDIO_NOTES);
}

export async function hasAudioNote(day: number): Promise<boolean> {
  return (await getAudioNote(day)) !== undefined;
}
