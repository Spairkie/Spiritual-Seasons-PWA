/** Minimal inline nav icon set — 24x24, 1.75px stroke, currentColor so
 * NavItem's active/inactive text color drives the icon color too. Kept
 * as plain SVG rather than an icon library dependency for five icons. */

interface IconProps {
  class?: string;
}

const commonProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 1.75,
  'stroke-linecap': 'round' as const,
  'stroke-linejoin': 'round' as const,
};

export function HomeIcon({ class: className }: IconProps) {
  return (
    <svg {...commonProps} class={className} aria-hidden="true">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

export function ReadIcon({ class: className }: IconProps) {
  return (
    <svg {...commonProps} class={className} aria-hidden="true">
      <path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z" />
      <path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5v-13Z" />
    </svg>
  );
}

export function ContentsIcon({ class: className }: IconProps) {
  return (
    <svg {...commonProps} class={className} aria-hidden="true">
      <path d="M8 6h12" />
      <path d="M8 12h12" />
      <path d="M8 18h12" />
      <path d="M4 6h.01" />
      <path d="M4 12h.01" />
      <path d="M4 18h.01" />
    </svg>
  );
}

export function ProgressIcon({ class: className }: IconProps) {
  return (
    <svg {...commonProps} class={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3.2 2" />
    </svg>
  );
}

export function SettingsIcon({ class: className }: IconProps) {
  return (
    <svg {...commonProps} class={className} aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function HeartIcon({ class: className, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg
      {...commonProps}
      fill={filled ? 'currentColor' : 'none'}
      class={className}
      aria-hidden="true"
    >
      <path d="M12 20.5s-7.5-4.6-10-9.3C.6 8 2 4.5 5.3 3.8c2-.4 3.9.5 5 2.2 1.1-1.7 3-2.6 5-2.2C18.6 4.5 20 8 18 11.2c-2.5 4.7-10 9.3-10 9.3Z" />
    </svg>
  );
}

export function ChevronLeftIcon({ class: className }: IconProps) {
  return (
    <svg {...commonProps} class={className} aria-hidden="true">
      <path d="M15 5 8 12l7 7" />
    </svg>
  );
}

export function ChevronRightIcon({ class: className }: IconProps) {
  return (
    <svg {...commonProps} class={className} aria-hidden="true">
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function CheckIcon({ class: className }: IconProps) {
  return (
    <svg {...commonProps} class={className} aria-hidden="true">
      <path d="M5 12.5 10 17l9-10" />
    </svg>
  );
}

export function ShareIcon({ class: className }: IconProps) {
  return (
    <svg {...commonProps} class={className} aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 10.5 15.4 6.5" />
      <path d="M8.6 13.5 15.4 17.5" />
    </svg>
  );
}

export function MicIcon({ class: className }: IconProps) {
  return (
    <svg {...commonProps} class={className} aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10.5v1.5a7 7 0 0 0 14 0v-1.5" />
      <path d="M12 19v3" />
      <path d="M8.5 22h7" />
    </svg>
  );
}

export function StopIcon({ class: className }: IconProps) {
  return (
    <svg {...commonProps} fill="currentColor" class={className} aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

export function TrashIcon({ class: className }: IconProps) {
  return (
    <svg {...commonProps} class={className} aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7" />
      <path d="M6 7v12.5A1.5 1.5 0 0 0 7.5 21h9a1.5 1.5 0 0 0 1.5-1.5V7" />
    </svg>
  );
}

export function ImageIcon({ class: className }: IconProps) {
  return (
    <svg {...commonProps} class={className} aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M21 16l-5.5-5.5a1.5 1.5 0 0 0-2.1 0L4 19" />
    </svg>
  );
}

export function WindIcon({ class: className }: IconProps) {
  return (
    <svg {...commonProps} class={className} aria-hidden="true">
      <path d="M3 8h11.5a2.5 2.5 0 1 0-2.5-2.5" />
      <path d="M3 12h15.5a2.5 2.5 0 1 1-2.5 2.5" />
      <path d="M3 16h9.5a2.5 2.5 0 1 1-2.5 2.5" />
    </svg>
  );
}

export function MusicNoteIcon({ class: className }: IconProps) {
  return (
    <svg {...commonProps} class={className} aria-hidden="true">
      <path d="M9 18V5l11-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="17" cy="16" r="3" />
    </svg>
  );
}

export function TimerIcon({ class: className }: IconProps) {
  return (
    <svg {...commonProps} class={className} aria-hidden="true">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5" />
      <path d="M9 2h6" />
    </svg>
  );
}

export function FlameIcon({ class: className }: IconProps) {
  return (
    <svg {...commonProps} class={className} aria-hidden="true">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}
