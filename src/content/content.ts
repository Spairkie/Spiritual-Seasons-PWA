/** Loads and caches the two static content files (fetched once, from
 * public/content/, cached by the service worker per vite.config.ts's
 * NetworkFirst runtime-caching rule) and exposes typed lookups over them. */

import { useEffect, useState } from 'preact/hooks';
import type { BookData, BookSeason, DayEntry, SeasonId } from '@/types/book';
import type { QuizData } from '@/types/quiz';

let bookPromise: Promise<BookData> | null = null;
let quizPromise: Promise<QuizData> | null = null;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

export function loadBookData(): Promise<BookData> {
  bookPromise ??= fetchJson<BookData>('/content/book.json');
  return bookPromise;
}

export function loadQuizData(): Promise<QuizData> {
  quizPromise ??= fetchJson<QuizData>('/content/quiz.json');
  return quizPromise;
}

/** Days are a single 1-120 sequence split into four contiguous 30-day
 * seasons (verified against the live content, not assumed): winter 1-30,
 * spring 31-60, summer 61-90, autumn 91-120. */
export function getSeasonIdForDay(day: number): SeasonId {
  if (day <= 30) return 'winter';
  if (day <= 60) return 'spring';
  if (day <= 90) return 'summer';
  return 'autumn';
}

const SEASON_START_DAY: Record<SeasonId, number> = { winter: 1, spring: 31, summer: 61, autumn: 91 };

export function getFirstDayOfSeason(seasonId: SeasonId): number {
  return SEASON_START_DAY[seasonId];
}

export function getSeasonById(book: BookData, seasonId: SeasonId): BookSeason {
  const season = book.seasons.find((s) => s.id === seasonId);
  if (!season) throw new Error(`Unknown season id: ${seasonId}`);
  return season;
}

export function getSeasonForDay(book: BookData, day: number): BookSeason {
  return getSeasonById(book, getSeasonIdForDay(day));
}

export function getDayEntry(book: BookData, day: number): DayEntry {
  const season = getSeasonForDay(book, day);
  const entry = season.days.find((d) => d.day === day);
  if (!entry) throw new Error(`Day ${day} not found in season ${season.id}`);
  return entry;
}

export const TOTAL_DAYS = 120;

interface ContentState {
  book: BookData | null;
  quiz: QuizData | null;
  error: Error | null;
}

/** Loads both content files once and re-renders the consuming component
 * when they land. Safe to call from multiple components simultaneously —
 * the underlying fetches are cached by loadBookData()/loadQuizData(). */
export function useContent(): ContentState {
  const [state, setState] = useState<ContentState>({ book: null, quiz: null, error: null });

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadBookData(), loadQuizData()])
      .then(([book, quiz]) => {
        if (!cancelled) setState({ book, quiz, error: null });
      })
      .catch((error: Error) => {
        if (!cancelled) setState({ book: null, quiz: null, error });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
