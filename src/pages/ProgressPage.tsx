import { useEffect, useState } from 'preact/hooks';
import { Card, ProgressRing } from '@/components/ui';
import { FlameIcon } from '@/components/icons';
import { SEASON_LABELS, TOTAL_DAYS, useContent } from '@/content/content';
import * as store from '@/store';
import type { SeasonId } from '@/types/book';

interface ProgressState {
  completedCount: number;
  journalCount: number;
  currentStreak: number;
  longestStreak: number;
  bySeason: Record<SeasonId, number>;
}

function useProgressState(): ProgressState | null {
  const [state, setState] = useState<ProgressState | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await store.init();
      const [progress, journal, streak] = await Promise.all([
        store.getAllProgress(),
        store.getAllJournalEntries(),
        store.getStreak(),
      ]);
      if (cancelled) return;

      const bySeason: Record<SeasonId, number> = { winter: 0, spring: 0, summer: 0, autumn: 0 };
      for (const p of progress) {
        if (p.completed && p.season) bySeason[p.season]++;
      }

      setState({
        completedCount: progress.filter((p) => p.completed).length,
        journalCount: journal.filter((j) => j.content.trim().length > 0).length,
        currentStreak: streak.current,
        longestStreak: streak.longest,
        bySeason,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export function ProgressPage() {
  const { book, error } = useContent();
  const state = useProgressState();

  if (error) {
    return (
      <div class="p-5">
        <Card padding="lg">
          <p class="text-danger-deep">Couldn't load your progress. Please try again.</p>
        </Card>
      </div>
    );
  }

  if (!book || !state) {
    return (
      <div class="p-5">
        <p class="text-ink-3">Loading…</p>
      </div>
    );
  }

  const overallPercent = Math.round((state.completedCount / TOTAL_DAYS) * 100);

  return (
    <div class="p-5">
      <div class="mx-auto grid max-w-4xl gap-5 md:grid-cols-[1fr_1.4fr]">
        <div class="flex flex-col gap-5">
          <Card padding="lg" class="flex flex-col items-center text-center">
            <ProgressRing percent={overallPercent} size={112} strokeWidth={10} label="Overall progress">
              <span class="font-serif text-2xl font-semibold">{overallPercent}%</span>
            </ProgressRing>
            <p class="mt-3 text-sm text-ink-3">
              {state.completedCount} of {TOTAL_DAYS} days complete
            </p>
          </Card>

          <Card padding="lg">
            <div class="flex items-center gap-3">
              <FlameIcon class="h-6 w-6 text-accent-deep" />
              <div>
                <p class="font-serif text-lg font-semibold text-ink">{state.currentStreak}-day streak</p>
                <p class="text-sm text-ink-3">Longest: {state.longestStreak} days</p>
              </div>
            </div>
          </Card>

          <Card padding="lg">
            <p class="text-sm text-ink-3">Journal entries</p>
            <p class="font-serif text-2xl font-semibold text-ink">{state.journalCount}</p>
          </Card>
        </div>

        <Card padding="lg">
          <p class="mb-4 font-serif text-lg font-semibold text-ink">By season</p>
          <div class="flex flex-col gap-4">
            {book.seasons.map((season) => {
              const completed = state.bySeason[season.id];
              const percent = Math.round((completed / season.days.length) * 100);
              return (
                <div key={season.id}>
                  <div class="mb-1.5 flex items-center justify-between text-sm">
                    <span class="font-semibold text-ink">{SEASON_LABELS[season.id]}</span>
                    <span class="text-ink-3">
                      {completed} of {season.days.length}
                    </span>
                  </div>
                  <div class="h-2 overflow-hidden rounded-full bg-line">
                    <div
                      class="h-full rounded-full bg-accent transition-[width] duration-500 ease-[var(--ease-standard)]"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
