import { Sheet } from '@/components/ui';
import { GLOBAL_SHORTCUTS, READ_PAGE_SHORTCUTS, type ShortcutEntry } from '@/lib/keyboardShortcuts';

export interface ShortcutsHelpSheetProps {
  open: boolean;
  onClose: () => void;
}

function ShortcutRow({ entry }: { entry: ShortcutEntry }) {
  return (
    <div class="flex items-center justify-between py-1.5">
      <span class="text-[15px] text-ink-2">{entry.description}</span>
      <kbd class="rounded-control border border-line bg-surface-2 px-2 py-0.5 font-mono text-xs font-semibold text-ink">
        {entry.key === ' ' ? 'Space' : entry.key}
      </kbd>
    </div>
  );
}

/** Opened by the `?` key (see useShortcuts wiring in AppShell). Lists both
 * the always-on global shortcuts and the ones only active on the Read page,
 * since a user pressing `?` on the Read page still needs to see both sets. */
export function ShortcutsHelpSheet({ open, onClose }: ShortcutsHelpSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title="Keyboard shortcuts">
      <div class="flex flex-col gap-4">
        <div>
          <h3 class="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-ink-3">Anywhere</h3>
          <div class="divide-y divide-line">
            {GLOBAL_SHORTCUTS.map((entry) => (
              <ShortcutRow key={entry.key} entry={entry} />
            ))}
          </div>
        </div>
        <div>
          <h3 class="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-ink-3">On a devotional day</h3>
          <div class="divide-y divide-line">
            {READ_PAGE_SHORTCUTS.map((entry) => (
              <ShortcutRow key={entry.key} entry={entry} />
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
