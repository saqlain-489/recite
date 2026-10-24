import { describe, expect, it } from 'vitest';
import samples from '../data/samples.json';
import { BISMILLAH, BUNDLED_IDS, CHAPTERS, TEXT_SOURCE, bundledSurah, chapterById } from './fixture';

describe('bundled Quran text', () => {
  it('names its source', () => {
    expect(TEXT_SOURCE.url).toBe('https://api.quran.com/api/v4');
    expect(samples.source.url).toBe(TEXT_SOURCE.url);
  });

  it('lists all 114 surahs and bundles Al-Fatiha and surahs 105 to 114', () => {
    expect(CHAPTERS.map((c) => c.id)).toEqual(Array.from({ length: 114 }, (_, i) => i + 1));
    expect([...BUNDLED_IDS]).toEqual([1, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114]);
  });

  it('has every verse of each bundled surah, in order, with words in order', () => {
    for (const id of BUNDLED_IDS) {
      const surah = bundledSurah(id)!;
      expect(surah.verses.map((v) => v.verse_number)).toEqual(
        Array.from({ length: chapterById(id).verses_count }, (_, i) => i + 1),
      );
      for (const verse of surah.verses) {
        expect(verse.verse_key).toBe(`${id}:${verse.verse_number}`);
        expect(verse.words.map((w) => w.position)).toEqual(verse.words.map((_, i) => i + 1));
        for (const w of verse.words) {
          expect(w.text_uthmani).toMatch(/^[\p{Script=Arabic}\p{M}\u{0640} ]+$/u);
          expect(w.text_imlaei.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('keeps the text exactly as published, without Unicode normalisation', () => {
    const all = [...BUNDLED_IDS].flatMap((id) => bundledSurah(id)!.verses.flatMap((v) => v.words.map((w) => w.text_uthmani)));
    expect(all.some((w) => w !== w.normalize('NFC'))).toBe(true);
    expect(BISMILLAH).toHaveLength(4);
    expect(chapterById(1).bismillah_pre).toBe(false);
    expect(chapterById(112).bismillah_pre).toBe(true);
  });
});
