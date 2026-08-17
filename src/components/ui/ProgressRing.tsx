import type { ComponentChildren } from 'preact';

export interface ProgressRingProps {
  /** 0-100 */
  percent: number;
  size?: number;
  strokeWidth?: number;
  children?: ComponentChildren;
  label?: string;
}

export function ProgressRing({
  percent,
  size = 96,
  strokeWidth = 8,
  children,
  label,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const center = size / 2;

  return (
    <div
      class="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role={label ? 'img' : undefined}
      aria-label={label ? `${label}: ${Math.round(clamped)}%` : undefined}
    >
      <svg width={size} height={size} class="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--color-line)"
          stroke-width={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--color-accent)"
          stroke-width={strokeWidth}
          stroke-linecap="round"
          stroke-dasharray={circumference}
          stroke-dashoffset={offset}
          class="transition-[stroke-dashoffset] duration-500 ease-[var(--ease-standard)]"
        />
      </svg>
      {children && <div class="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}
