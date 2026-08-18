import { useEffect, useRef, useState } from 'preact/hooks';
import { Button, Card } from '@/components/ui';
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, HeartIcon, ShareIcon } from '@/components/icons';
import { getDayEntry, getSeasonForDay, TOTAL_DAYS, useContent } from '@/content/content';
import { currentRoute, navigate } from '@/router/router';
import * as store from '@/store';
import { isTtsSupported, speak, stopSpeaking } from '@/lib/tts';
import { shareText } from '@/lib/share';
import { WellnessSheet } from '@/components/wellness/WellnessSheet';

/** Matches legacy CONFIG.JOURNAL.AUTOSAVE_DELAY_MS. */
const AUTOSAVE_DELAY_MS = 2000;
const MAX_JOURNAL_LENGTH = 50000;

type SaveStatus = 'idle' | 'saving' | 'saved';

function dayFromRouteParam(): number | null {
  const param = currentRoute.value.params.param;
  const parsed = param ? Number(param) : NaN;
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= TOTAL_DAYS ? parsed : null;
}

interface DayState {
  content: string;
  isFavorite: boolean;
  isComplete: boolean;
  autoSave: boolean;
  ttsRate: number;
}

export function ReadPage() {
  const { book, error } = useContent();
  const [day, setDay] = useState<number | null>(dayFromRouteParam);
  const [state, setState] = useState<DayState | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [speaking, setSpeaking] = useState(false);
  const [wellnessOpen, setWellnessOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'shared' | 'copied' | 'failed'>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stop any in-progress narration when navigating away from this day.
  useEffect(() => {
    return () => stopSpeaking();
  }, [day]);

  // If no explicit day was in the URL (e.g. the Read nav item, which links
  // to #read with no day), resolve it from the stored current day instead —
  // deferred to an effect since that read is async. Renders nothing below
  // until day is known, so there's no Day-1 flash before the real day loads.
  useEffect(() => {
    if (day !== null) return;
    store.getCurrentDay().then(setDay);
  }, [day]);

  useEffect(() => {
    if (day === null) return;
    let cancelled = false;
    setState(null);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    (async () => {
      await store.init();
      const [journalEntry, progress, isFavorite, autoSave, ttsRate] = await Promise.all([
        store.getJournalEntry(day),
        store.getDayProgress(day),
        store.isFavorite(day),
        store.getSetting('autoSave'),
        store.getSetting('ttsRate'),
      ]);
      if (cancelled) return;
      setState({
        content: journalEntry?.content ?? '',
        isFavorite,
        isComplete: !!progress?.completed,
        autoSave,
        ttsRate,
      });
      await store.setCurrentDay(day);
    })();
    return () => {
      cancelled = true;
    };
  }, [day]);

  if (error) {
    return (
      <div class="p-5">
        <Card padding="lg">
          <p class="text-danger-deep">Couldn't load this day. Please try again.</p>
        </Card>
      </div>
    );
  }

  if (!book || !state || day === null) {
    return (
      <div class="p-5">
        <p class="text-ink-3">Loading…</p>
      </div>
    );
  }

  // Local consts, not the useState bindings directly — TS can't carry the
  // above guard's narrowing into closures defined below (they could in
  // principle run after a later render), so capture the known-non-null
  // values once here instead of asserting non-null at every use site.
  const resolvedDay = day;
  const resolvedState = state;

  const season = getSeasonForDay(book, resolvedDay);
  const entry = getDayEntry(book, resolvedDay);

  function goToDay(nextDay: number) {
    if (nextDay < 1 || nextDay > TOTAL_DAYS) return;
    setDay(nextDay);
    navigate('read', { param: nextDay });
  }

  function saveContent(content: string) {
    setSaveStatus('saving');
    store.saveJournalEntry(resolvedDay, content, season.id).then(() => setSaveStatus('saved'));
  }

  function handleInput(content: string) {
    setState((prev) => (prev ? { ...prev, content } : prev));
    if (!resolvedState.autoSave) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus('idle');
    saveTimer.current = setTimeout(() => saveContent(content), AUTOSAVE_DELAY_MS);
  }

  async function toggleComplete() {
    if (resolvedState.isComplete) {
      await store.markDayIncomplete(resolvedDay);
    } else {
      await store.markDayComplete(resolvedDay, season.id);
    }
    setState((prev) => (prev ? { ...prev, isComplete: !prev.isComplete } : prev));
  }

  async function toggleFavorite() {
    const nowFavorite = await store.toggleFavorite(resolvedDay, season.id, entry.scriptureRef);
    setState((prev) => (prev ? { ...prev, isFavorite: nowFavorite } : prev));
  }

  function toggleSpeak() {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    speak(`${entry.scriptureRef}. ${entry.scriptureText}`, resolvedState.ttsRate, () => setSpeaking(false));
    setSpeaking(true);
  }

  async function share() {
    const result = await shareText(
      entry.scriptureRef,
      `${entry.scriptureRef}\n\n"${entry.scriptureText}"\n\n— Spiritual Seasons, Day ${resolvedDay}`
    );
    setShareStatus(result);
    setTimeout(() => setShareStatus('idle'), 2000);
  }

  return (
    <div class="p-5">
      <div class="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
        <Card padding="lg">
          <div class="flex items-center justify-between">
            <button
              type="button"
              onClick={() => goToDay(resolvedDay - 1)}
              disabled={resolvedDay <= 1}
              aria-label="Previous day"
              class="flex h-8 w-8 items-center justify-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink disabled:opacity-30"
            >
              <ChevronLeftIcon class="h-5 w-5" />
            </button>
            <span class="text-sm font-semibold text-ink-3">
              Day {resolvedDay} of {TOTAL_DAYS}
            </span>
            <button
              type="button"
              onClick={() => goToDay(resolvedDay + 1)}
              disabled={resolvedDay >= TOTAL_DAYS}
              aria-label="Next day"
              class="flex h-8 w-8 items-center justify-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink disabled:opacity-30"
            >
              <ChevronRightIcon class="h-5 w-5" />
            </button>
          </div>

          <div class="mt-4 flex items-start justify-between gap-3">
            <p class="font-serif text-xl font-semibold text-ink">{entry.scriptureRef}</p>
            {isTtsSupported() && (
              <button
                type="button"
                onClick={toggleSpeak}
                class="shrink-0 text-sm font-semibold text-accent-deep hover:underline"
              >
                {speaking ? 'Stop' : 'Listen'}
              </button>
            )}
          </div>
          <p class="mt-2 text-ink-2">{entry.scriptureText}</p>

          <p class="mt-5 font-serif text-lg text-ink">Reflect</p>
          <p class="mt-1 text-ink-2">{entry.prompt}</p>

          <div class="mt-6 flex gap-3">
            <Button
              variant={state.isComplete ? 'secondary' : 'primary'}
              onClick={() => void toggleComplete()}
              class="flex-1"
            >
              <CheckIcon class="h-4 w-4" />
              {state.isComplete ? 'Completed' : 'Mark complete'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => void toggleFavorite()}
              aria-label={state.isFavorite ? 'Remove from favourites' : 'Add to favourites'}
              aria-pressed={state.isFavorite}
              class={state.isFavorite ? '!text-danger' : ''}
            >
              <HeartIcon class="h-4 w-4" filled={state.isFavorite} />
            </Button>
            <Button variant="secondary" onClick={() => void share()} aria-label="Share this verse">
              <ShareIcon class="h-4 w-4" />
            </Button>
          </div>
          {shareStatus !== 'idle' && (
            <p class="mt-2 text-center text-sm text-ink-3">
              {shareStatus === 'shared' && 'Shared'}
              {shareStatus === 'copied' && 'Copied to clipboard'}
              {shareStatus === 'failed' && "Couldn't share — try again"}
            </p>
          )}

          <button
            type="button"
            onClick={() => setWellnessOpen(true)}
            class="mt-3 w-full text-center text-sm font-semibold text-ink-3 hover:text-ink-2"
          >
            Take a moment — timer, breathing, ambient sound
          </button>
        </Card>

        <Card padding="lg">
          <div class="flex items-center justify-between">
            <p class="font-serif text-lg text-ink">Journal</p>
            <span class="text-xs text-ink-3">
              {saveStatus === 'saving' && 'Saving…'}
              {saveStatus === 'saved' && 'Saved'}
            </span>
          </div>
          <textarea
            value={state.content}
            maxLength={MAX_JOURNAL_LENGTH}
            onInput={(e) => handleInput((e.target as HTMLTextAreaElement).value)}
            placeholder="Write your reflections here…"
            aria-label="Journal entry"
            class="mt-3 h-64 w-full resize-none rounded-control border border-line bg-paper p-3 text-[15px] text-ink outline-none focus-visible:border-accent"
          />
          {!state.autoSave && (
            <Button class="mt-3" variant="secondary" onClick={() => saveContent(state.content)}>
              Save entry
            </Button>
          )}
        </Card>
      </div>

      <WellnessSheet open={wellnessOpen} onClose={() => setWellnessOpen(false)} />
    </div>
  );
}
