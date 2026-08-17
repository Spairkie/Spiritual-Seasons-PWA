import { useEffect, useState } from 'preact/hooks';
import { Card, ListRow } from '@/components/ui';
import { CheckIcon, HeartIcon } from '@/components/icons';
import { SEASON_LABELS, useContent } from '@/content/content';
import { navigate } from '@/router/router';
import * as store from '@/store';
import type { BookSeason } from '@/types/book';

type Filter = 'all' | 'favourites';

interface DayStatus {
  completedDays: Set<number>;
  favouriteDays: Set<number>;
}

function useDayStatus(): DayStatus | null {
  const [status, setStatus] = useState<DayStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await store.init();
      const [progress, favorites] = await Promise.all([store.getAllProgress(), store.getAllFavorites()]);
      if (cancelled) return;
      setStatus({
        completedDays: new Set(progress.filter((p) => p.completed).map((p) => p.day)),
        favouriteDays: new Set(favorites.map((f) => f.day)),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}

function SeasonSection({
  season,
  status,
  filter,
}: {
  season: BookSeason;
  status: DayStatus;
  filter: Filter;
}) {
  const days =
    filter === 'favourites'
      ? season.days.filter((d) => status.favouriteDays.has(d.day))
      : season.days;

  if (days.length === 0) return null;

  return (
    <div class="mb-6">
      <h2 class="mb-2 px-1 font-serif text-lg font-semibold text-ink">{SEASON_LABELS[season.id]}</h2>
      <Card padding="none">
        {days.map((entry) => (
          <ListRow
            key={entry.day}
            onClick={() => navigate('read', { param: entry.day })}
            title={`Day ${entry.day}: ${entry.scriptureRef}`}
            trailing={
              <span class="flex items-center gap-2 text-ink-3">
                {status.favouriteDays.has(entry.day) && <HeartIcon class="h-4 w-4 text-danger" filled />}
                {status.completedDays.has(entry.day) && <CheckIcon class="h-4 w-4 text-accent-deep" />}
              </span>
            }
          />
        ))}
      </Card>
    </div>
  );
}

export function ContentsPage() {
  const { book, error } = useContent();
  const status = useDayStatus();
  const [filter, setFilter] = useState<Filter>('all');

  if (error) {
    return (
      <div class="p-5">
        <Card padding="lg">
          <p class="text-danger-deep">Couldn't load contents. Please try again.</p>
        </Card>
      </div>
    );
  }

  if (!book || !status) {
    return (
      <div class="p-5">
        <p class="text-ink-3">Loading…</p>
      </div>
    );
  }

  const hasFavourites = status.favouriteDays.size > 0;
  const noFavouritesYet = filter === 'favourites' && !hasFavourites;

  return (
    <div class="p-5">
      <div class="mx-auto max-w-2xl">
        <div class="mb-5 inline-flex rounded-control border border-line bg-surface-2 p-1">
          {(['all', 'favourites'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              class={[
                'rounded-[calc(var(--radius-control)-4px)] px-4 py-1.5 text-sm font-semibold transition-colors',
                filter === f ? 'bg-surface text-ink shadow-soft' : 'text-ink-3 hover:text-ink-2',
              ].join(' ')}
            >
              {f === 'all' ? 'All days' : 'Favourites'}
            </button>
          ))}
        </div>

        {noFavouritesYet ? (
          <Card padding="lg">
            <p class="text-ink-2">
              No favourites yet. Tap the heart on any day's reading to save it here.
            </p>
          </Card>
        ) : (
          book.seasons.map((season) => (
            <SeasonSection key={season.id} season={season} status={status} filter={filter} />
          ))
        )}
      </div>
    </div>
  );
}
