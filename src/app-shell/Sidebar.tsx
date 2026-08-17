import { NavItem } from '@/components/ui';
import { FlameIcon } from '@/components/icons';
import { navigate, type RouteName } from '@/router/router';
import { NAV_ENTRIES } from './nav';

export interface SidebarProps {
  active: RouteName;
  streak: number;
}

/** Desktop only (md breakpoint and up) — BottomNav covers the same
 * destinations on mobile. Fixed-width rail matching --spacing-sidebar. */
export function Sidebar({ active, streak }: SidebarProps) {
  return (
    <nav
      aria-label="Primary"
      class={[
        'fixed inset-y-0 left-0 z-40 hidden w-sidebar flex-col',
        'border-r border-line bg-surface md:flex',
      ].join(' ')}
    >
      <div class="flex h-header items-center px-5">
        <span class="font-serif text-lg font-semibold text-ink">Spiritual Seasons</span>
      </div>

      <div class="flex flex-1 flex-col gap-1 px-3 py-2">
        {NAV_ENTRIES.map((entry) => (
          <NavItem
            key={entry.route}
            icon={<entry.icon />}
            label={entry.label}
            active={active === entry.route}
            onClick={() => navigate(entry.route)}
            orientation="horizontal"
          />
        ))}
      </div>

      {streak > 0 && (
        <div class="mx-3 mb-4 flex items-center gap-2 rounded-control bg-tint px-3 py-2.5 text-sm font-semibold text-accent-deep">
          <FlameIcon class="h-4 w-4" />
          <span>
            {streak} day{streak === 1 ? '' : 's'} streak
          </span>
        </div>
      )}
    </nav>
  );
}
