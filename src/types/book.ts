/** Content types for content/book.json. Shape verified against the live file —
 * do not "clean up" fields that look redundant (e.g. season.overview vs.
 * seasonalOverviews) without re-checking the JSON; both are real and used. */

export type SeasonId = 'winter' | 'spring' | 'summer' | 'autumn';

export const SEASON_IDS: readonly SeasonId[] = ['winter', 'spring', 'summer', 'autumn'];

export interface ScriptureRef {
  reference: string;
  text: string;
}

export interface FrontMatter {
  introduction: {
    text: string;
    scripture: ScriptureRef;
    purpose: string;
  };
  howToUse: {
    steps: string[];
  };
}

export interface DayEntry {
  day: number; // 1-120
  scriptureRef: string;
  scriptureText: string;
  prompt: string;
  /** Vestigial — physical-book page number. Never rendered. */
  pdfPage: number;
}

export interface SeasonOverview {
  description: string;
  characteristics: NamedItemGroup;
  practices: PracticeGroup;
}

export interface NamedItemGroup {
  title: string;
  items: Array<{ name: string; description: string }>;
}

export interface PracticeGroup {
  title: string;
  items: Array<{ practice: string; description: string }>;
}

export interface VerseGroup {
  title: string;
  verses: ScriptureRef[];
}

export interface BookSeason {
  id: SeasonId;
  title: string; // e.g. "Winter – A Season of Stillness & Trust (Days 1-30)"
  daysRange: string; // e.g. "1–30" (display only, not parsed)
  color: string;
  colorLight: string;
  colorDark: string;
  overview: SeasonOverview;
  days: DayEntry[];
}

/** Richer per-season front matter, keyed by SeasonId — separate from
 * BookSeason.overview, which is a shorter summary used for quick lookups. */
export interface SeasonalOverview {
  title: string;
  introduction: string;
  characteristics: NamedItemGroup;
  practices: PracticeGroup;
  scripturalInspiration: VerseGroup;
  closing: string;
}

export interface BookData {
  title: string;
  subtitle: string;
  author: string;
  description: string;
  acknowledgements: string;
  aboutAuthor: string;
  frontMatter: FrontMatter;
  seasons: BookSeason[];
  seasonalOverviews: Record<SeasonId, SeasonalOverview>;
}
