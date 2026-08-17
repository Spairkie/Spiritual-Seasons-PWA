import type { ComponentChildren, JSX } from 'preact';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm';

export interface ButtonProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: ComponentChildren;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-on-accent hover:bg-accent-deep active:bg-accent-deep disabled:bg-line disabled:text-ink-muted',
  secondary:
    'bg-surface-2 text-ink border border-line hover:bg-tint hover:border-line-2 disabled:text-ink-muted',
  ghost: 'bg-transparent text-ink-2 hover:bg-surface-2 disabled:text-ink-muted',
  danger:
    'bg-danger text-on-accent hover:bg-danger-deep disabled:bg-line disabled:text-ink-muted',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: 'h-11 px-5 text-[15px] gap-2',
  sm: 'h-9 px-3.5 text-sm gap-1.5',
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  class: className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      class={[
        'inline-flex items-center justify-center rounded-control font-semibold',
        'transition-colors duration-150 ease-[var(--ease-standard)]',
        'disabled:cursor-not-allowed disabled:opacity-70',
        'focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}
