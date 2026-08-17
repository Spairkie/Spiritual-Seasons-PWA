import { describe, expect, it } from 'vitest';
import {
  getDayEntry,
  getSeasonById,
  getSeasonForDay,
  getSeasonIdForDay,
} from '@/content/content';
import type { BookData, BookSeason, DayEntry } from '@/types/book';

function makeSeason(id: BookSeason['id'], start: number): BookSeason {
  const days: DayEntry[] = Array.from({ length: 30 }, (_, i) => ({
    day: start + i,
    scriptureRef: `Ref ${start + i}`,
    scriptureText: `Text ${start + i}`,
    prompt: `Prompt ${start + i}`,
    pdfPage: start + i,
  }));
  return {
    id,
    title: id,
    daysRange: `${start}–${start + 29}`,
    color: '#000',
    colorLight: '#111',
    colorDark: '#222',
    overview: {
      description: '',
      characteristics: { title: '', items: [] },
      practices: { title: '', items: [] },
    },
    days,
  };
}

const book: BookData = {
  title: 't',
  subtitle: 's',
  author: 'a',
  description: 'd',
  acknowledgements: '',
  aboutAuthor: '',
  frontMatter: {
    introduction: { text: '', scripture: { reference: '', text: '' }, purpose: '' },
    howToUse: { steps: [] },
  },
  seasons: [
    makeSeason('winter', 1),
    makeSeason('spring', 31),
    makeSeason('summer', 61),
    makeSeason('autumn', 91),
  ],
  seasonalOverviews: {
    winter: { title: '', introduction: '', characteristics: { title: '', items: [] }, practices: { title: '', items: [] }, scripturalInspiration: { title: '', verses: [] }, closing: '' },
    spring: { title: '', introduction: '', characteristics: { title: '', items: [] }, practices: { title: '', items: [] }, scripturalInspiration: { title: '', verses: [] }, closing: '' },
    summer: { title: '', introduction: '', characteristics: { title: '', items: [] }, practices: { title: '', items: [] }, scripturalInspiration: { title: '', verses: [] }, closing: '' },
    autumn: { title: '', introduction: '', characteristics: { title: '', items: [] }, practices: { title: '', items: [] }, scripturalInspiration: { title: '', verses: [] }, closing: '' },
  },
};

describe('getSeasonIdForDay', () => {
  it('maps each 30-day block to the right season', () => {
    expect(getSeasonIdForDay(1)).toBe('winter');
    expect(getSeasonIdForDay(30)).toBe('winter');
    expect(getSeasonIdForDay(31)).toBe('spring');
    expect(getSeasonIdForDay(60)).toBe('spring');
    expect(getSeasonIdForDay(61)).toBe('summer');
    expect(getSeasonIdForDay(90)).toBe('summer');
    expect(getSeasonIdForDay(91)).toBe('autumn');
    expect(getSeasonIdForDay(120)).toBe('autumn');
  });
});

describe('getSeasonById / getSeasonForDay', () => {
  it('finds a season by id', () => {
    expect(getSeasonById(book, 'summer').id).toBe('summer');
  });

  it('throws for a day-derived id that somehow does not exist', () => {
    const empty: BookData = { ...book, seasons: [] };
    expect(() => getSeasonForDay(empty, 1)).toThrow();
  });
});

describe('getDayEntry', () => {
  it('returns the correct entry at a season boundary', () => {
    expect(getDayEntry(book, 30).scriptureRef).toBe('Ref 30');
    expect(getDayEntry(book, 31).scriptureRef).toBe('Ref 31');
  });

  it('throws for a day outside the loaded range', () => {
    expect(() => getDayEntry(book, 200)).toThrow();
  });
});
