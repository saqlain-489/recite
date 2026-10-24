import { describe, expect, it } from 'vitest';
import { expectedSamples } from '../test/expected';
import { buildExpected } from './expected';
import { BISMILLAH, bundledSurah, chapterById } from './fixture';

const build = (id: number, from: number, to: number) => buildExpected(bundledSurah(id)!, chapterById(id), { from, to }, BISMILLAH);

describe('buildExpected', () => {
  it('puts an optional Bismillah before a surah that opens with one', () => {
    const words = build(112, 1, 4);
    expect(words.slice(0, 4).every((w) => w.optional && w.verseKey === '112:0')).toBe(true);
    expect(words.slice(4).some((w) => w.optional)).toBe(false);
    expect(words.map((w) => w.index)).toEqual(words.map((_, i) => i));
  });

  it('treats the Bismillah of Al-Fatiha as its first verse', () => {
    const words = build(1, 1, 7);
    expect(words[0]).toMatchObject({ verseKey: '1:1', optional: false });
    expect(words).toHaveLength(29);
  });

  it('keeps only the chosen verses and drops the Bismillah when starting later', () => {
    const words = build(114, 3, 4);
    expect(new Set(words.map((w) => w.verseKey))).toEqual(new Set(['114:3', '114:4']));
    expect(words.some((w) => w.optional)).toBe(false);
  });

  it('flags the disconnected letters', () => {
    const words = expectedSamples(42);
    expect(words.filter((w) => w.muqattaat).map((w) => [w.verseKey, w.muqattaat])).toEqual([
      ['42:1', 'حم'],
      ['42:2', 'عسق'],
    ]);
  });
});
