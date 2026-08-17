import type { ComponentChildren } from 'preact';

export interface NavItemProps {
  icon: ComponentChildren;
  label: string;
  active?: boolean;
  onClick: () => void;
  /** 'vertical' = mobile bottom nav (icon over label), 'horizontal' = desktop sidebar. */
  orientation?: 'vertical' | 'horizontal';
}

export function NavItem({
  icon,
  label,
  active = false,
  onClick,
  orientation = 'vertical',
}: NavItemProps) {
  const isVertical = orientation === 'vertical';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      class={[
        'flex items-center rounded-control transition-colors duration-150',
        'focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]',
        isVertical
          ? 'flex-1 flex-col justify-center gap-1 py-1.5 text-[11px]'
          : 'w-full gap-3 px-3 py-2.5 text-[15px]',
        active ? 'text-accent-deep' : 'text-ink-3 hover:text-ink-2',
      ].join(' ')}
    >
      <span
        class={[
          'flex items-center justify-center',
          isVertical ? 'h-6 w-6' : 'h-5 w-5',
          active && !isVertical ? 'text-accent-deep' : '',
        ].join(' ')}
      >
        {icon}
      </span>
      <span class={active ? 'font-semibold' : 'font-medium'}>{label}</span>
    </button>
  );
}
