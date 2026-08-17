import { FlameIcon } from '@/components/icons';

export interface HeaderProps {
  title: string;
  streak: number;
}

/** Sticky within the content column (which is itself already offset past
 * the desktop Sidebar) — not a full-bleed fixed bar, so it never needs to
 * reason about the sidebar's width itself. Shows the streak on mobile only;
 * Sidebar already surfaces it on desktop. */
export function Header({ title, streak }: HeaderProps) {
  return (
    <header
      class={[
        'sticky top-0 z-30 flex h-header items-center justify-between',
        'border-b border-line bg-paper/90 px-5 backdrop-blur-sm',
      ].join(' ')}
    >
      <h1 class="font-serif text-xl font-semibold text-ink">{title}</h1>
      {streak > 0 && (
        <div class="flex items-center gap-1.5 text-sm font-semibold text-accent-deep md:hidden">
          <FlameIcon class="h-4 w-4" />
          <span>{streak}</span>
        </div>
      )}
    </header>
  );
}
