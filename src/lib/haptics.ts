import { settingsSignal } from '@/state/settings';

/** Same pattern set as legacy/js/modules/haptics.js, trimmed to the types
 * this app actually triggers. */
const PATTERNS = {
  light: [10],
  selection: [5],
  success: [10, 50, 10],
} as const;

export type HapticType = keyof typeof PATTERNS;

export function isHapticsSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function triggerHaptic(type: HapticType = 'light'): void {
  if (!isHapticsSupported()) return;
  if (!settingsSignal.value?.hapticsEnabled) return;
  try {
    navigator.vibrate(PATTERNS[type]);
  } catch {
    // Vibration can throw on some browsers outside a user gesture; feedback
    // is best-effort, so just drop it rather than surfacing an error.
  }
}
