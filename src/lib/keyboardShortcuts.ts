export function isTouchDevice(): boolean {
  return typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
}

/** Matches legacy KeyboardShortcuts.handleKeyPress: don't hijack keys while
 * the user is typing, and never intercept a browser/OS chord. */
export function shouldIgnoreKeyEvent(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement | null;
  const tag = target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return true;
  if (e.ctrlKey || e.altKey || e.metaKey) return true;
  return false;
}

export interface ShortcutEntry {
  key: string;
  description: string;
}

export const GLOBAL_SHORTCUTS: ShortcutEntry[] = [
  { key: 'h', description: 'Go home' },
  { key: 'c', description: 'Contents' },
  { key: 's', description: 'Search (in Contents)' },
  { key: '?', description: 'Show this help' },
];

export const READ_PAGE_SHORTCUTS: ShortcutEntry[] = [
  { key: 'n', description: 'Next day' },
  { key: 'p', description: 'Previous day' },
  { key: 'f', description: 'Toggle favourite' },
  { key: 'm', description: 'Mark complete' },
  { key: 'j', description: 'Jump to journal' },
];
