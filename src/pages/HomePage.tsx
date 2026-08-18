import { useEffect, useState } from 'preact/hooks';
import { Badge, Button, Card, ProgressRing } from '@/components/ui';
import { FlameIcon, HeartIcon, MusicNoteIcon, TimerIcon, WindIcon } from '@/components/icons';
import { SEASON_LABELS, getDayEntry, getSeasonForDay, TOTAL_DAYS, useContent } from '@/content/content';
import { navigate } from '@/router/router';
import * as store from '@/store';
import { checkReflectionDue } from '@/lib/weeklyReflection';
import { WeeklyReflectionSheet } from '@/components/WeeklyReflectionSheet';
import { WellnessSheet, type WellnessTab } from '@/components/wellness/WellnessSheet';

interface WellnessTile {
  tab: WellnessTab;
  label: string;
  hint: string;
  icon: typeof TimerIcon;
  gradient: string;
}

const WELLNESS_TILES: WellnessTile[] = [
  { tab: 'timer', label: '5 min meditation', hint: 'Peace & stillness', icon: TimerIcon, gradient: 'from-[#22B8CF] to-[#0F9CB3]' },
  { tab: 'breathe', label: 'Breathe', hint: 'Box pattern 4-4-4-4', icon: WindIcon, gradient: 'from-[#9775FA] to-[#7048C4]' },
  { tab: 'sound', label: 'Ambient sounds', hint: 'Calming soundscape', icon: MusicNoteIcon, gradient: 'from-[#51CF66] to-[#2F9E44]' },
];

interface HomeState {
  currentDay: number;
  streak: number;
  completedCount: number;
  isDayComplete: boolean;
}

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
  const [dueWeek, setDueWeek] = useState<number | null>(null);
  const [reflectionOpen, setReflectionOpen] = useState(false);
  const [wellnessTab, setWellnessTab] = useState<WellnessTab>('timer');
  const [wellnessOpen, setWellnessOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    checkReflectionDue().then((week) => {
      if (!cancelled) setDueWeek(week);
    });
    return () => {
      cancelled = true;
    };
  }, [home?.completedCount]);

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

          {dueWeek !== null && (
            <Card padding="lg">
              <p class="text-sm font-semibold text-ink">Week {dueWeek} reflection</p>
              <p class="mt-1 text-sm text-ink-3">
                You've completed a week of devotions — take a moment to reflect.
              </p>
              <Button class="mt-3" variant="secondary" fullWidth onClick={() => setReflectionOpen(true)}>
                Reflect now
              </Button>
            </Card>
          )}
        </div>
      </div>

      <div class="mx-auto mt-8 max-w-4xl">
        <h2 class="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-ink-3">
          Quick wellness tools
        </h2>
        <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
          {WELLNESS_TILES.map((tile) => (
            <button
              key={tile.tab}
              type="button"
              onClick={() => {
                setWellnessTab(tile.tab);
                setWellnessOpen(true);
              }}
              class={[
                'flex flex-col items-center gap-2 rounded-card bg-gradient-to-br p-5 text-center text-on-accent shadow-soft transition-transform hover:-translate-y-0.5',
                tile.gradient,
              ].join(' ')}
            >
              <tile.icon class="h-6 w-6" />
              <span class="text-sm font-semibold">{tile.label}</span>
              <span class="text-xs opacity-85">{tile.hint}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => navigate('contents')}
            class="flex flex-col items-center gap-2 rounded-card bg-gradient-to-br from-danger to-danger-deep p-5 text-center text-on-accent shadow-soft transition-transform hover:-translate-y-0.5"
          >
            <HeartIcon class="h-6 w-6" filled />
            <span class="text-sm font-semibold">Favourites</span>
            <span class="text-xs opacity-85">View saved days</span>
          </button>
        </div>
      </div>

      <WellnessSheet open={wellnessOpen} onClose={() => setWellnessOpen(false)} initialTab={wellnessTab} />

      {dueWeek !== null && (
        <WeeklyReflectionSheet
          week={dueWeek}
          open={reflectionOpen}
          onClose={() => setReflectionOpen(false)}
          onSaved={() => {
            setReflectionOpen(false);
            setDueWeek(null);
          }}
        />
      )}
    </div>
  );
}
