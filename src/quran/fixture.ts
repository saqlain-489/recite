import data from '../data/quran.json';
import type { Chapter, QuranWord, Surah, TextSource } from './types';

interface Fixture {
  readonly source: TextSource;
  readonly chapters: readonly Chapter[];
  readonly surahs: readonly Surah[];
}

const fixture: Fixture = data;

export const TEXT_SOURCE = fixture.source;
export const CHAPTERS = fixture.chapters;
export const BUNDLED_IDS: ReadonlySet<number> = new Set(fixture.surahs.map((s) => s.id));

export function bundledSurah(id: number): Surah | undefined {
  return fixture.surahs.find((s) => s.id === id);
}

export function chapterById(id: number): Chapter {
  const found = CHAPTERS.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown surah ${id}`);
  return found;
}

// Al-Fatiha's first verse, shown and accepted before every surah that opens with the Bismillah.
export const BISMILLAH: readonly QuranWord[] = bundledSurah(1)?.verses[0]?.words ?? [];
