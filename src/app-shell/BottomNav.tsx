import { NavItem } from '@/components/ui';
import { navigate, type RouteName } from '@/router/router';
import { NAV_ENTRIES } from './nav';

export interface BottomNavProps {
  active: RouteName;
}

/** Mobile only — hidden at the md breakpoint where Sidebar takes over. */
export function BottomNav({ active }: BottomNavProps) {
  return (
    <nav
      aria-label="Primary"
      class={[
        'fixed inset-x-0 bottom-0 z-40 flex md:hidden',
        'h-[calc(var(--spacing-bottom-nav)+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)]',
        'border-t border-line bg-surface/95 backdrop-blur-sm',
      ].join(' ')}
    >
      {NAV_ENTRIES.map((entry) => (
        <NavItem
          key={entry.route}
          icon={<entry.icon />}
          label={entry.label}
          active={active === entry.route}
          onClick={() => navigate(entry.route)}
          orientation="vertical"
        />
      ))}
    </nav>
  );
}
