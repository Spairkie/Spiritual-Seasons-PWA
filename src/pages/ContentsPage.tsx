import { useEffect, useState } from 'preact/hooks';
import { Card, ListRow } from '@/components/ui';
import { CheckIcon, HeartIcon } from '@/components/icons';
import { SEASON_LABELS, useContent } from '@/content/content';
import { navigate } from '@/router/router';
import * as store from '@/store';
import type { BookSeason, DayEntry } from '@/types/book';

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

function matchesQuery(entry: DayEntry, query: string): boolean {
  const q = query.toLowerCase();
  return (
    entry.scriptureRef.toLowerCase().includes(q) ||
    entry.scriptureText.toLowerCase().includes(q) ||
    entry.prompt.toLowerCase().includes(q) ||
    String(entry.day) === q
  );
}

function SeasonSection({
  season,
  status,
  predicate,
}: {
  season: BookSeason;
  status: DayStatus;
  predicate: (entry: DayEntry) => boolean;
}) {
  const days = season.days.filter(predicate);
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
  const [query, setQuery] = useState('');

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

  const trimmedQuery = query.trim();
  const searching = trimmedQuery.length > 0;

  // A search overrides the All/Favourites filter rather than combining
  // with it — searching "how do I..." shouldn't silently exclude results
  // just because the Favourites tab happened to be selected.
  const predicate = (entry: DayEntry) => {
    if (searching) return matchesQuery(entry, trimmedQuery);
    return filter === 'favourites' ? status.favouriteDays.has(entry.day) : true;
  };

  const hasFavourites = status.favouriteDays.size > 0;
  const noFavouritesYet = !searching && filter === 'favourites' && !hasFavourites;
  const noSearchResults = searching && !book.seasons.some((s) => s.days.some(predicate));

  return (
    <div class="p-5">
      <div class="mx-auto max-w-2xl">
        <input
          type="search"
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          placeholder="Search scripture, prompts, or day number…"
          aria-label="Search contents"
          class="mb-4 w-full rounded-control border border-line bg-surface px-4 py-2.5 text-[15px] text-ink outline-none focus-visible:border-accent"
        />

        {!searching && (
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
        )}

        {noFavouritesYet && (
          <Card padding="lg">
            <p class="text-ink-2">
              No favourites yet. Tap the heart on any day's reading to save it here.
            </p>
          </Card>
        )}

        {noSearchResults && (
          <Card padding="lg">
            <p class="text-ink-2">No days match "{trimmedQuery}".</p>
          </Card>
        )}

        {!noFavouritesYet &&
          !noSearchResults &&
          book.seasons.map((season) => (
            <SeasonSection key={season.id} season={season} status={status} predicate={predicate} />
          ))}
      </div>
    </div>
  );
}
