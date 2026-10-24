import { analyzeWord, muqattaatAt, type ExpectedWord } from '../engine';
import type { Chapter, QuranWord, Surah, VerseRange } from './types';

export const BISMILLAH_VERSE = 0;

export function buildExpected(
  surah: Surah,
  chapter: Chapter,
  range: VerseRange,
  bismillah: readonly QuranWord[],
): ExpectedWord[] {
  const words: ExpectedWord[] = [];
  const add = (verseKey: string, position: number, text: string, optional: boolean, muqattaat: string | null) => {
    words.push({ index: words.length, verseKey, position, text, form: analyzeWord(text), optional, muqattaat });
  };

  if (chapter.bismillah_pre && range.from === 1) {
    for (const w of bismillah) add(`${surah.id}:${BISMILLAH_VERSE}`, w.position, w.text_uthmani, true, null);
  }
  for (const verse of surah.verses) {
    if (verse.verse_number < range.from || verse.verse_number > range.to) continue;
    for (const w of verse.words) {
      add(verse.verse_key, w.position, w.text_uthmani, false, muqattaatAt(surah.id, verse.verse_number, w.position));
    }
  }
  return words;
}
