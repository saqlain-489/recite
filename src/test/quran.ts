import samples from '../data/samples.json';
import { stripMarks } from '../engine/normalize';
import { BISMILLAH, bundledSurah } from '../quran/fixture';
import type { Verse } from '../quran/types';

export const SAMPLE_VERSES: readonly Verse[] = samples.verses;

export function verse(key: string): Verse {
  const [surahId, verseNumber] = key.split(':').map(Number);
  const found =
    bundledSurah(surahId)?.verses.find((v) => v.verse_number === verseNumber) ??
    SAMPLE_VERSES.find((v) => v.verse_key === key);
  if (!found) throw new Error(`No fixture verse ${key}`);
  return found;
}

function word(key: string, position: number) {
  const found = verse(key).words.find((w) => w.position === position);
  if (!found) throw new Error(`No word ${key}:${position}`);
  return found;
}

export const uthmani = (key: string, position: number) => word(key, position).text_uthmani;
export const imlaei = (key: string, position: number) => word(key, position).text_imlaei;

// What a recogniser would write for a word: standard spelling, no marks, split where standard spelling splits.
export const spoken = (key: string, position: number) => stripMarks(imlaei(key, position)).split(' ');

export const spokenVerse = (key: string) => verse(key).words.flatMap((w) => stripMarks(w.text_imlaei).split(' '));

export function spokenBismillah(): string[] {
  return BISMILLAH.flatMap((w) => stripMarks(w.text_imlaei).split(' '));
}

export function spokenSurah(id: number): string[] {
  const surah = bundledSurah(id);
  if (!surah) throw new Error(`Surah ${id} is not bundled`);
  return surah.verses.flatMap((v) => spokenVerse(v.verse_key));
}

export function allBundledWords() {
  return [1, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114].flatMap((id) =>
    (bundledSurah(id)?.verses ?? []).flatMap((v) => v.words.map((w) => ({ key: v.verse_key, ...w }))),
  );
}
