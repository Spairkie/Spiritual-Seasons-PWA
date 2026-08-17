import { useMemo, useState } from 'preact/hooks';
import { Button, Card } from '@/components/ui';
import { SEASON_LABELS, useContent, getFirstDayOfSeason } from '@/content/content';
import { computeScores, determineOutcome, flattenQuestions } from '@/content/quizLogic';
import { quizAnswerKey } from '@/types/quiz';
import type { QuizAnswers } from '@/types/quiz';
import type { SeasonId } from '@/types/book';
import { navigate } from '@/router/router';
import * as store from '@/store';

type Phase = 'start' | 'question' | 'tie' | 'result';

export function QuizPage() {
  const { quiz, error } = useContent();
  const [phase, setPhase] = useState<Phase>('start');
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [resolvedSeason, setResolvedSeason] = useState<SeasonId | null>(null);
  const [saving, setSaving] = useState(false);

  const flatQuestions = useMemo(() => (quiz ? flattenQuestions(quiz) : []), [quiz]);
  const outcome = useMemo(() => {
    if (!quiz || (phase !== 'tie' && phase !== 'result')) return null;
    return determineOutcome(computeScores(quiz, answers));
  }, [quiz, answers, phase]);

  if (error) {
    return (
      <div class="p-5">
        <Card padding="lg">
          <p class="text-danger-deep">Couldn't load the quiz. Please try again.</p>
        </Card>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div class="p-5">
        <p class="text-ink-3">Loading…</p>
      </div>
    );
  }

  async function finish(seasonId: SeasonId) {
    setSaving(true);
    const scores = computeScores(quiz!, answers);
    await store.saveQuizResults({ scores, winningSeason: seasonId });
    await store.setCurrentSeason(seasonId);
    // Only jump the reader to the season's first day on first-ever
    // completion — retaking the quiz later shouldn't discard progress.
    const completedCount = await store.getCompletedDaysCount();
    if (completedCount === 0) {
      await store.setCurrentDay(getFirstDayOfSeason(seasonId));
    }
    await store.saveSetting('onboardingCompleted', true);
    setResolvedSeason(seasonId);
    setPhase('result');
    setSaving(false);
  }

  function answer(value: number) {
    const q = flatQuestions[questionIndex];
    if (!q) return;
    const next = { ...answers, [quizAnswerKey(q.seasonId, q.questionIndex)]: value };
    setAnswers(next);

    if (questionIndex + 1 < flatQuestions.length) {
      setQuestionIndex(questionIndex + 1);
      return;
    }

    const result = determineOutcome(computeScores(quiz!, next));
    if (result.winningSeason) {
      void finish(result.winningSeason);
    } else {
      setPhase('tie');
    }
  }

  if (phase === 'start') {
    return (
      <div class="mx-auto max-w-lg p-5">
        <Card padding="lg">
          <h2 class="font-serif text-2xl font-semibold text-ink">{quiz.title}</h2>
          <p class="mt-3 text-ink-2">{quiz.description}</p>
          <p class="mt-4 text-sm text-ink-3">{quiz.instructions}</p>
          <Button class="mt-6" fullWidth onClick={() => setPhase('question')}>
            Start the quiz
          </Button>
        </Card>
      </div>
    );
  }

  if (phase === 'question') {
    const q = flatQuestions[questionIndex]!;
    const progress = Math.round(((questionIndex + 1) / flatQuestions.length) * 100);
    return (
      <div class="mx-auto max-w-lg p-5">
        <div class="mb-4">
          <div class="mb-2 flex items-center justify-between text-xs font-semibold text-ink-3">
            <span>
              Question {questionIndex + 1} of {flatQuestions.length}
            </span>
            <span>{progress}%</span>
          </div>
          <div class="h-1.5 overflow-hidden rounded-full bg-line">
            <div
              class="h-full rounded-full bg-accent transition-[width] duration-300 ease-[var(--ease-standard)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <Card padding="lg">
          <p class="font-serif text-xl text-ink">{q.text}</p>
          <div class="mt-6 flex flex-col gap-2">
            {Object.entries(quiz.scale.labels).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => answer(Number(value))}
                class="flex items-center justify-between rounded-control border border-line px-4 py-3 text-left transition-colors hover:border-accent hover:bg-tint focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                <span class="text-[15px] font-medium text-ink">{label}</span>
                <span class="text-sm text-ink-muted">{value}</span>
              </button>
            ))}
          </div>
          {questionIndex > 0 && (
            <button
              type="button"
              onClick={() => setQuestionIndex(questionIndex - 1)}
              class="mt-4 text-sm font-semibold text-ink-3 hover:text-ink-2"
            >
              ← Back
            </button>
          )}
        </Card>
      </div>
    );
  }

  if (phase === 'tie' && outcome) {
    return (
      <div class="mx-auto max-w-lg p-5">
        <Card padding="lg">
          <h2 class="font-serif text-xl font-semibold text-ink">A close call</h2>
          <p class="mt-2 text-ink-2">
            A couple of seasons feel equally true for you right now. Which one resonates most?
          </p>
          <div class="mt-5 flex flex-col gap-2">
            {outcome.tiedSeasons.map((seasonId) => (
              <Button key={seasonId} variant="secondary" onClick={() => void finish(seasonId)} disabled={saving}>
                {SEASON_LABELS[seasonId]}
              </Button>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (phase === 'result' && resolvedSeason) {
    const result = quiz.results[resolvedSeason];
    return (
      <div class="mx-auto max-w-lg p-5">
        <Card padding="lg">
          <p class="text-sm font-semibold uppercase tracking-wide text-accent-deep">Your season</p>
          <h2 class="mt-1 font-serif text-2xl font-semibold text-ink">{result.title}</h2>
          <p class="mt-3 text-ink-2">{result.message}</p>
          <p class="mt-4 font-serif italic text-ink-2">{result.encouragement}</p>
          <Button class="mt-6" fullWidth onClick={() => navigate('home')}>
            Begin the journey
          </Button>
        </Card>
      </div>
    );
  }

  return null;
}
