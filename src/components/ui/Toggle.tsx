export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Visually hidden, but required — announces what the switch controls. */
  label: string;
  id?: string;
}

export function Toggle({ checked, onChange, disabled = false, label, id }: ToggleProps) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      class={[
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full',
        'transition-colors duration-200 ease-[var(--ease-standard)]',
        'focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-60',
        checked ? 'bg-accent' : 'bg-line-2',
      ].join(' ')}
    >
      <span
        class={[
          'inline-block h-5 w-5 rounded-full bg-surface shadow-soft',
          'transition-transform duration-200 ease-[var(--ease-spring)]',
          checked ? 'translate-x-6' : 'translate-x-1',
        ].join(' ')}
      />
    </button>
  );
}
