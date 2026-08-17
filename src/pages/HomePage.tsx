import { useEffect, useState } from 'preact/hooks';
import { Badge, Button, Card, ProgressRing } from '@/components/ui';
import { FlameIcon } from '@/components/icons';
import { getDayEntry, getSeasonForDay, TOTAL_DAYS, useContent } from '@/content/content';
import { navigate } from '@/router/router';
import * as store from '@/store';
import type { SeasonId } from '@/types/book';

interface HomeState {
  currentDay: number;
  streak: number;
  completedCount: number;
  isDayComplete: boolean;
}

const SEASON_LABELS: Record<SeasonId, string> = {
  winter: 'Winter',
  spring: 'Spring',
  summer: 'Summer',
  autumn: 'Autumn',
};

function useHomeState(): HomeState | null {
  const [state, setState] = useState<HomeState | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await store.init();
      const [currentDay, streakData, completedCount] = await Promise.all([
        store.getCurrentDay(),
        store.getStreak(),
        store.getCompletedDaysCount(),
      ]);
      const dayProgress = await store.getDayProgress(currentDay);
      if (!cancelled) {
        setState({
          currentDay,
          streak: streakData.current,
          completedCount,
          isDayComplete: !!dayProgress?.completed,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export function HomePage() {
  const { book, error } = useContent();
  const home = useHomeState();

  if (error) {
    return (
      <div class="p-5">
        <Card padding="lg">
          <p class="text-danger-deep">Couldn't load today's reading. Please try again.</p>
        </Card>
      </div>
    );
  }

  if (!book || !home) {
    return (
      <div class="p-5">
        <p class="text-ink-3">Loading…</p>
      </div>
    );
  }

  const season = getSeasonForDay(book, home.currentDay);
  const dayEntry = getDayEntry(book, home.currentDay);
  const dayInSeason = home.currentDay - (season.days[0]?.day ?? home.currentDay) + 1;
  const overallPercent = Math.round((home.completedCount / TOTAL_DAYS) * 100);

  return (
    <div class="p-5">
      <div class="mx-auto grid max-w-4xl gap-5 md:grid-cols-[1.6fr_1fr]">
        <Card padding="lg">
          <div class="flex items-center justify-between">
            <Badge variant="accent">{SEASON_LABELS[season.id]}</Badge>
            <span class="text-sm text-ink-3">
              Day {dayInSeason} of {season.days.length}
            </span>
          </div>

          <p class="mt-4 font-serif text-2xl font-semibold text-ink">
            Day {home.currentDay}: {dayEntry.scriptureRef}
          </p>
          <p class="mt-3 line-clamp-3 text-ink-2">{dayEntry.scriptureText}</p>

          <Button class="mt-6" fullWidth onClick={() => navigate('read', { param: home.currentDay })}>
            {home.isDayComplete ? 'Read again' : 'Continue reading'}
          </Button>
          {home.isDayComplete && (
            <p class="mt-3 text-center text-sm font-semibold text-accent-deep">
              ✓ You completed today's reading
            </p>
          )}
        </Card>

        <div class="flex flex-col gap-5">
          <Card padding="lg" class="flex items-center gap-4">
            <ProgressRing percent={overallPercent} size={72} strokeWidth={7} label="Overall progress">
              <span class="font-serif text-base font-semibold">{overallPercent}%</span>
            </ProgressRing>
            <div>
              <p class="text-sm font-semibold text-ink">Your journey</p>
              <p class="text-sm text-ink-3">
                {home.completedCount} of {TOTAL_DAYS} days
              </p>
            </div>
          </Card>

          {home.streak > 0 && (
            <Card padding="lg" class="flex items-center gap-3">
              <FlameIcon class="h-6 w-6 text-accent-deep" />
              <div>
                <p class="text-sm font-semibold text-ink">
                  {home.streak} day{home.streak === 1 ? '' : 's'} streak
                </p>
                <p class="text-sm text-ink-3">Keep it going today</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
