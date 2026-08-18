import { useEffect, useState } from 'preact/hooks';
import { Sheet } from '@/components/ui';
import { MeditationTimer } from './MeditationTimer';
import { BreathingExercise } from './BreathingExercise';
import { AMBIENT_PRESETS, getCurrentPreset, playAmbientSound, stopAmbientSound } from '@/lib/ambientSound';
import type { AmbientPreset } from '@/lib/ambientSound';

export type WellnessTab = 'timer' | 'breathe' | 'sound';

const TABS: Array<{ value: WellnessTab; label: string }> = [
  { value: 'timer', label: 'Timer' },
  { value: 'breathe', label: 'Breathe' },
  { value: 'sound', label: 'Sound' },
];

export interface WellnessSheetProps {
  open: boolean;
  onClose: () => void;
  initialTab?: WellnessTab;
}

function AmbientSoundPicker() {
  const [active, setActive] = useState<AmbientPreset>(getCurrentPreset());

  function select(preset: AmbientPreset) {
    if (preset === active) {
      stopAmbientSound();
      setActive('silence');
    } else {
      playAmbientSound(preset);
      setActive(preset);
    }
  }

  return (
    <div class="flex flex-col gap-2">
      {AMBIENT_PRESETS.filter((p) => p.value !== 'silence').map((preset) => (
        <button
          key={preset.value}
          type="button"
          onClick={() => select(preset.value)}
          class={[
            'flex items-center justify-between rounded-control border px-4 py-3 text-left text-[15px] font-medium transition-colors',
            active === preset.value
              ? 'border-accent bg-tint text-accent-deep'
              : 'border-line text-ink hover:bg-surface-2',
          ].join(' ')}
        >
          {preset.label}
          <span class="text-xs text-ink-3">{active === preset.value ? 'Playing — tap to stop' : ''}</span>
        </button>
      ))}
    </div>
  );
}

export function WellnessSheet({ open, onClose, initialTab = 'timer' }: WellnessSheetProps) {
  const [tab, setTab] = useState<WellnessTab>(initialTab);

  // Jump to whichever tab the caller opened this sheet for (e.g. Home's
  // "Breathe" tile) each time it's (re)opened, rather than only on mount.
  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  // Ambient sound is meant to keep playing while the sheet is closed (it's
  // background audio for reading/journaling) — only stop it when the whole
  // page unmounts, never on sheet close.
  useEffect(() => () => stopAmbientSound(), []);

  return (
    <Sheet open={open} onClose={onClose} title="Wellness">
      <div class="mb-5 inline-flex rounded-control border border-line bg-surface-2 p-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            class={[
              'rounded-[calc(var(--radius-control)-4px)] px-4 py-1.5 text-sm font-semibold transition-colors',
              tab === t.value ? 'bg-surface text-ink shadow-soft' : 'text-ink-3 hover:text-ink-2',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'timer' && <MeditationTimer />}
      {tab === 'breathe' && <BreathingExercise />}
      {tab === 'sound' && <AmbientSoundPicker />}
    </Sheet>
  );
}
