import type { SeasonId } from '@/types/book';
import type { QuizAnswers, QuizData, QuizScores } from '@/types/quiz';
import { quizAnswerKey } from '@/types/quiz';

export function computeScores(quiz: QuizData, answers: QuizAnswers): QuizScores {
  const scores = {} as QuizScores;
  for (const season of quiz.seasons) {
    let total = 0;
    for (let i = 0; i < season.questions.length; i++) {
      total += answers[quizAnswerKey(season.id, i)] ?? 0;
    }
    scores[season.id] = total;
  }
  return scores;
}

export interface QuizOutcome {
  scores: QuizScores;
  /** Populated once a single winner is known (either outright, or after a
   * tie is resolved by the caller). */
  winningSeason: SeasonId | null;
  /** More than one entry means the caller must prompt the user to choose,
   * per quiz.json's rules.tieBehavior ('prompt_user_choice'). */
  tiedSeasons: SeasonId[];
}

export function determineOutcome(scores: QuizScores): QuizOutcome {
  const entries = Object.entries(scores) as [SeasonId, number][];
  const maxScore = Math.max(...entries.map(([, score]) => score));
  const tied = entries.filter(([, score]) => score === maxScore).map(([id]) => id);

  if (tied.length === 1) {
    return { scores, winningSeason: tied[0]!, tiedSeasons: [] };
  }
  return { scores, winningSeason: null, tiedSeasons: tied };
}

export interface FlatQuestion {
  seasonId: SeasonId;
  questionIndex: number;
  text: string;
}

/** Flattens quiz.seasons into one ordered list so the UI can present
 * "question N of TOTAL" without caring about season boundaries. */
export function flattenQuestions(quiz: QuizData): FlatQuestion[] {
  return quiz.seasons.flatMap((season) =>
    season.questions.map((text, questionIndex) => ({ seasonId: season.id, questionIndex, text }))
  );
}
