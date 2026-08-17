import type { ComponentChildren, JSX } from 'preact';

export type BadgeVariant = 'accent' | 'neutral' | 'danger';

export interface BadgeProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ComponentChildren;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  accent: 'bg-tint text-accent-deep',
  neutral: 'bg-surface-2 text-ink-2',
  danger: 'bg-danger/10 text-danger-deep',
};

export function Badge({ variant = 'accent', class: className, children, ...rest }: BadgeProps) {
  return (
    <span
      class={[
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold leading-none',
        VARIANT_CLASSES[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </span>
  );
}
