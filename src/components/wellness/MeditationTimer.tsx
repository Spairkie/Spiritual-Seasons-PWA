import { useEffect, useRef, useState } from 'preact/hooks';
import { Button } from '@/components/ui';
import { playChime } from '@/lib/chime';

const PRESETS_MINUTES = [1, 3, 5, 10];

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function MeditationTimer() {
  const [durationSeconds, setDurationSeconds] = useState(PRESETS_MINUTES[0]! * 60);
  const [remaining, setRemaining] = useState(durationSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setRunning(false);
          playChime();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  function selectPreset(minutes: number) {
    setRunning(false);
    setDurationSeconds(minutes * 60);
    setRemaining(minutes * 60);
  }

  function reset() {
    setRunning(false);
    setRemaining(durationSeconds);
  }

  const progress = 1 - remaining / durationSeconds;

  return (
    <div class="flex flex-col items-center">
      <div class="mb-4 flex gap-2">
        {PRESETS_MINUTES.map((minutes) => (
          <button
            key={minutes}
            type="button"
            onClick={() => selectPreset(minutes)}
            disabled={running}
            class={[
              'rounded-control px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-40',
              durationSeconds === minutes * 60
                ? 'bg-accent text-on-accent'
                : 'bg-surface-2 text-ink-2 hover:bg-tint',
            ].join(' ')}
          >
            {minutes} min
          </button>
        ))}
      </div>

      <div class="relative flex h-40 w-40 items-center justify-center">
        <svg width="160" height="160" class="-rotate-90">
          <circle cx="80" cy="80" r="72" fill="none" stroke="var(--color-line)" stroke-width="6" />
          <circle
            cx="80"
            cy="80"
            r="72"
            fill="none"
            stroke="var(--color-accent)"
            stroke-width="6"
            stroke-linecap="round"
            stroke-dasharray={2 * Math.PI * 72}
            stroke-dashoffset={2 * Math.PI * 72 * (1 - progress)}
            class="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <span class="absolute font-serif text-3xl font-semibold text-ink">{formatTime(remaining)}</span>
      </div>

      <div class="mt-5 flex gap-3">
        <Button onClick={() => setRunning((r) => !r)} disabled={remaining === 0}>
          {running ? 'Pause' : 'Start'}
        </Button>
        <Button variant="secondary" onClick={reset}>
          Reset
        </Button>
      </div>
    </div>
  );
}
