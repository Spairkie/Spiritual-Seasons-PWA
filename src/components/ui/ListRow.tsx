import type { ComponentChildren, JSX } from 'preact';

export interface ListRowProps
  extends Omit<JSX.HTMLAttributes<HTMLButtonElement | HTMLDivElement>, 'title'> {
  leading?: ComponentChildren;
  title: ComponentChildren;
  subtitle?: ComponentChildren;
  trailing?: ComponentChildren;
  onClick?: (event: MouseEvent) => void;
}

/** Renders a <button> when onClick is given (so it's keyboard-operable and
 * announced correctly), otherwise a plain row — same visual result either way. */
export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  onClick,
  class: className,
  ...rest
}: ListRowProps) {
  const content = (
    <>
      {leading && <span class="flex h-9 w-9 shrink-0 items-center justify-center text-accent">{leading}</span>}
      <span class="min-w-0 flex-1 text-left">
        <span class="block truncate text-[15px] font-medium text-ink">{title}</span>
        {subtitle && <span class="block truncate text-sm text-ink-3">{subtitle}</span>}
      </span>
      {trailing && <span class="flex shrink-0 items-center">{trailing}</span>}
    </>
  );

  const rowClasses = [
    'flex w-full items-center gap-3 rounded-control px-3 py-3 text-left',
    onClick
      ? 'transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]'
      : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        class={rowClasses}
        {...(rest as JSX.HTMLAttributes<HTMLButtonElement>)}
      >
        {content}
      </button>
    );
  }

  return (
    <div class={rowClasses} {...(rest as JSX.HTMLAttributes<HTMLDivElement>)}>
      {content}
    </div>
  );
}
