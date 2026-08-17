import { getDb } from './db';
import { STORE_NAMES, DEFAULT_SETTINGS } from '@/types/store';
import type { Settings, SettingsRecord } from '@/types/store';

export { DEFAULT_SETTINGS };

export async function getSettings(): Promise<Settings> {
  const db = await getDb();
  try {
    const stored = await db.get(STORE_NAMES.SETTINGS, 'app');
    const merged = { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
    // Strip the storage-only keyPath field — callers only want the Settings shape.
    const { key: _key, ...settings } = merged as SettingsRecord;
    return settings;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function getSetting<K extends keyof Settings>(key: K): Promise<Settings[K]> {
  const settings = await getSettings();
  return settings[key];
}

export async function saveSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K]
): Promise<void> {
  const settings = await getSettings();
  settings[key] = value;
  const db = await getDb();
  const record: SettingsRecord = { ...settings, key: 'app' };
  await db.put(STORE_NAMES.SETTINGS, record);
}

export async function saveSettings(newSettings: Partial<Settings>): Promise<void> {
  const settings = await getSettings();
  const db = await getDb();
  const record: SettingsRecord = { ...settings, ...newSettings, key: 'app' };
  await db.put(STORE_NAMES.SETTINGS, record);
}

export async function resetSettings(): Promise<void> {
  const db = await getDb();
  const record: SettingsRecord = { ...DEFAULT_SETTINGS, key: 'app' };
  await db.put(STORE_NAMES.SETTINGS, record);
}
