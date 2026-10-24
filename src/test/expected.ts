import { analyzeWord, type ExpectedWord } from '../engine';
import { buildExpected } from '../quran/expected';
import { BISMILLAH, bundledSurah, chapterById } from '../quran/fixture';
import type { Surah } from '../quran/types';
import { SAMPLE_VERSES } from './quran';

export function expectedSurah(id: number, from = 1, to = Number.POSITIVE_INFINITY): ExpectedWord[] {
  const surah = bundledSurah(id);
  if (!surah) throw new Error(`Surah ${id} is not bundled`);
  return buildExpected(surah, chapterById(id), { from, to }, BISMILLAH);
}

export function expectedSamples(surahId: number): ExpectedWord[] {
  const surah: Surah = { id: surahId, verses: SAMPLE_VERSES.filter((v) => v.verse_key.startsWith(`${surahId}:`)) };
  return buildExpected(surah, chapterById(surahId), { from: 1, to: Number.POSITIVE_INFINITY }, []);
}

export function expectedWords(texts: readonly string[]): ExpectedWord[] {
  return texts.map((text, index) => ({
    index,
    verseKey: '0:0',
    position: index + 1,
    text,
    form: analyzeWord(text),
    optional: false,
    muqattaat: null,
  }));
}
