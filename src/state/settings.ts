/** Reactive wrapper over the settings store — src/store is the persistence
 * layer (async, no notion of "current" state); this is the read-through
 * signal the UI subscribes to so a change in Settings repaints everywhere
 * (header theme, nav accent, etc.) without manual prop drilling. */

import { signal } from '@preact/signals';
import * as store from '@/store';
import type { Settings } from '@/types/store';

export const settingsSignal = signal<Settings | null>(null);

export async function initSettings(): Promise<void> {
  settingsSignal.value = await store.getSettings();
}

export async function updateSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K]
): Promise<void> {
  await store.saveSetting(key, value);
  settingsSignal.value = await store.getSettings();
}
