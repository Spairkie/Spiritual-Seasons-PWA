import { useEffect } from 'preact/hooks';
import { settingsSignal } from '@/state/settings';
import { isTouchDevice, shouldIgnoreKeyEvent } from '@/lib/keyboardShortcuts';

export type ShortcutMap = Record<string, () => void>;

/** Attaches a document-level keydown listener that dispatches to `map` by
 * `event.key`, gated on the keyboardShortcuts setting and the same guards
 * as the legacy app (skip while typing, skip on touch devices, skip
 * modifier chords). Re-attaches whenever `map` itself changes identity, so
 * callers should build it with useMemo/inline where its closures need
 * fresh state — same pattern as a dependency array. */
export function useShortcuts(map: ShortcutMap): void {
  // Render-time signal read subscribes this hook's owning component to
  // re-render (and thus re-run this effect) when the setting flips.
  const enabled = settingsSignal.value?.keyboardShortcuts ?? false;

  useEffect(() => {
    if (!enabled || isTouchDevice()) return;

    function handleKeydown(event: KeyboardEvent) {
      if (shouldIgnoreKeyEvent(event)) return;
      const action = map[event.key];
      if (!action) return;
      event.preventDefault();
      action();
    }

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [enabled, map]);
}
