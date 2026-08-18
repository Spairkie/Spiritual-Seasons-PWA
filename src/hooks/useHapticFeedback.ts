import { useEffect } from 'preact/hooks';
import { isHapticsSupported, triggerHaptic } from '@/lib/haptics';

/** One delegated set of listeners for the whole app (legacy attached
 * per-interaction listeners the same way, just directly on `document`) —
 * buzzes lightly on button taps, distinguishes nav items (inside a <nav>
 * landmark) with a slightly different pattern, and fires on
 * checkbox/radio/range changes. Mounted once in AppShell. */
export function useHapticFeedback(): void {
  useEffect(() => {
    if (!isHapticsSupported()) return;

    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const control = target?.closest<HTMLElement>('button, [role="button"]');
      if (!control || (control as HTMLButtonElement).disabled) return;
      triggerHaptic(control.closest('nav') ? 'selection' : 'light');
    }

    function handleChange(event: Event) {
      const target = event.target as HTMLInputElement;
      if (target.type === 'checkbox' || target.type === 'radio') {
        triggerHaptic('light');
      }
    }

    const lastRangeValue = new WeakMap<HTMLInputElement, string>();
    function handleInput(event: Event) {
      const target = event.target as HTMLInputElement;
      if (target.type !== 'range') return;
      if (lastRangeValue.get(target) === target.value) return;
      lastRangeValue.set(target, target.value);
      triggerHaptic('selection');
    }

    document.addEventListener('click', handleClick, { passive: true });
    document.addEventListener('change', handleChange, { passive: true });
    document.addEventListener('input', handleInput, { passive: true });
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('change', handleChange);
      document.removeEventListener('input', handleInput);
    };
  }, []);
}
