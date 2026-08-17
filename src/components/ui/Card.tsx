import type { ComponentChildren, JSX } from 'preact';

export interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Renders as a <button>-like interactive surface (hover/press affordance)
   * without actually changing the element — pass onClick and it's already
   * keyboard-operable via the button role callers should add if needed. */
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: ComponentChildren;
}

const PADDING_CLASSES: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export function Card({
  interactive = false,
  padding = 'md',
  class: className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      class={[
        'rounded-card bg-surface border border-line shadow-soft',
        PADDING_CLASSES[padding],
        interactive
          ? 'cursor-pointer transition-shadow duration-150 hover:shadow-panel/40 active:shadow-none'
          : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}
