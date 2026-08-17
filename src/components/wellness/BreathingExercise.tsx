import { useEffect, useRef, useState } from 'preact/hooks';
import { Button } from '@/components/ui';

type Phase = 'inhale' | 'hold1' | 'exhale' | 'hold2';

const PHASE_SECONDS = 4;
const PHASE_LABELS: Record<Phase, string> = {
  inhale: 'Breathe in',
  hold1: 'Hold',
  exhale: 'Breathe out',
  hold2: 'Hold',
};
const PHASE_ORDER: Phase[] = ['inhale', 'hold1', 'exhale', 'hold2'];
const PHASE_SCALE: Record<Phase, string> = {
  inhale: 'scale-100',
  hold1: 'scale-100',
  exhale: 'scale-50',
  hold2: 'scale-50',
};

/** Box breathing (4-4-4-4) — a simple, well-known pattern that doesn't
 * need explanation in the UI. Runs until the user stops it. */
export function BreathingExercise() {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<Phase>('inhale');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!running) return;
    timerRef.current = setTimeout(() => {
      setPhase((prev) => PHASE_ORDER[(PHASE_ORDER.indexOf(prev) + 1) % PHASE_ORDER.length]!);
    }, PHASE_SECONDS * 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [running, phase]);

  function toggle() {
    if (!running) setPhase('inhale');
    setRunning((r) => !r);
  }

  return (
    <div class="flex flex-col items-center">
      <div class="flex h-40 w-40 items-center justify-center">
        <div
          class={[
            'flex h-32 w-32 items-center justify-center rounded-full bg-tint text-accent-deep',
            'transition-transform ease-in-out',
            running ? PHASE_SCALE[phase] : 'scale-75',
          ].join(' ')}
          style={{ transitionDuration: `${PHASE_SECONDS}s` }}
        >
          <span class="px-2 text-center text-sm font-semibold">
            {running ? PHASE_LABELS[phase] : 'Ready'}
          </span>
        </div>
      </div>
      <Button class="mt-5" onClick={toggle}>
        {running ? 'Stop' : 'Start breathing'}
      </Button>
    </div>
  );
}
