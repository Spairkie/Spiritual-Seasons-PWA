import type { SeasonId } from './book';

export interface QuizScale {
  min: number;
  max: number;
  labels: Record<string, string>; // "1".."5" -> label
}

export interface QuizRules {
  minScore: number;
  maxScore: number;
  winnerLogic: 'highest_total';
  tieBehavior: 'prompt_user_choice';
}

export interface QuizSeason {
  id: SeasonId;
  title: string;
  shortTitle: string;
  description: string;
  /** Plain strings — position in the array is the question's identity
   * within its season (no separate id field in the source data). */
  questions: string[];
}

export interface QuizResultCopy {
  title: string;
  message: string;
  encouragement: string;
}

export interface QuizData {
  title: string;
  description: string;
  instructions: string;
  scale: QuizScale;
  rules: QuizRules;
  seasons: QuizSeason[];
  results: Record<SeasonId, QuizResultCopy>;
}

/** A single answered question, addressed by season + index into that
 * season's `questions` array. */
export interface QuizAnswerKey {
  seasonId: SeasonId;
  questionIndex: number;
}

export type QuizAnswers = Record<string, number>; // key = `${seasonId}:${questionIndex}`, value = 1-5

export interface QuizScores extends Record<SeasonId, number> {}

export interface QuizResult {
  scores: QuizScores;
  /** The winning season, or null if a tie is still unresolved. */
  winningSeason: SeasonId | null;
  /** Populated only when two or more seasons tie for the highest score. */
  tiedSeasons: SeasonId[];
}

export function quizAnswerKey(seasonId: SeasonId, questionIndex: number): string {
  return `${seasonId}:${questionIndex}`;
}
