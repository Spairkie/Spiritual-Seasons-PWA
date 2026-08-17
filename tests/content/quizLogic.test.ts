import { describe, expect, it } from 'vitest';
import { computeScores, determineOutcome, flattenQuestions } from '@/content/quizLogic';
import { quizAnswerKey } from '@/types/quiz';
import type { QuizData } from '@/types/quiz';

const quiz: QuizData = {
  title: 't',
  description: 'd',
  instructions: 'i',
  scale: { min: 1, max: 5, labels: {} },
  rules: { minScore: 2, maxScore: 10, winnerLogic: 'highest_total', tieBehavior: 'prompt_user_choice' },
  seasons: [
    { id: 'winter', title: 'Winter', shortTitle: 'Winter', description: '', questions: ['w1', 'w2'] },
    { id: 'spring', title: 'Spring', shortTitle: 'Spring', description: '', questions: ['s1', 's2'] },
    { id: 'summer', title: 'Summer', shortTitle: 'Summer', description: '', questions: ['su1', 'su2'] },
    { id: 'autumn', title: 'Autumn', shortTitle: 'Autumn', description: '', questions: ['a1', 'a2'] },
  ],
  results: {
    winter: { title: '', message: '', encouragement: '' },
    spring: { title: '', message: '', encouragement: '' },
    summer: { title: '', message: '', encouragement: '' },
    autumn: { title: '', message: '', encouragement: '' },
  },
};

describe('flattenQuestions', () => {
  it('flattens all seasons in order with correct indices', () => {
    const flat = flattenQuestions(quiz);
    expect(flat).toHaveLength(8);
    expect(flat[0]).toEqual({ seasonId: 'winter', questionIndex: 0, text: 'w1' });
    expect(flat[2]).toEqual({ seasonId: 'spring', questionIndex: 0, text: 's1' });
  });
});

describe('computeScores', () => {
  it('sums answers per season and treats unanswered as 0', () => {
    const answers = {
      [quizAnswerKey('winter', 0)]: 5,
      [quizAnswerKey('winter', 1)]: 4,
      [quizAnswerKey('spring', 0)]: 2,
    };
    const scores = computeScores(quiz, answers);
    expect(scores.winter).toBe(9);
    expect(scores.spring).toBe(2);
    expect(scores.summer).toBe(0);
    expect(scores.autumn).toBe(0);
  });
});

describe('determineOutcome', () => {
  it('picks a single outright winner', () => {
    const outcome = determineOutcome({ winter: 9, spring: 4, summer: 3, autumn: 2 });
    expect(outcome.winningSeason).toBe('winter');
    expect(outcome.tiedSeasons).toEqual([]);
  });

  it('reports every tied season when the top score is shared', () => {
    const outcome = determineOutcome({ winter: 8, spring: 8, summer: 3, autumn: 2 });
    expect(outcome.winningSeason).toBeNull();
    expect(outcome.tiedSeasons.sort()).toEqual(['spring', 'winter']);
  });

  it('handles a four-way tie', () => {
    const outcome = determineOutcome({ winter: 5, spring: 5, summer: 5, autumn: 5 });
    expect(outcome.tiedSeasons).toHaveLength(4);
  });
});
