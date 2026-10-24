import { describe, expect, it } from 'vitest';
import { spoken, uthmani } from '../test/quran';
import { alignUnits, levenshtein, unitDistance } from './editDistance';
import { analyzeWord, normalizeSpoken } from './normalize';

const heard = (key: string, position: number) => normalizeSpoken(spoken(key, position).join(''));

describe('levenshtein', () => {
  it('counts insertions, deletions and substitutions', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('flaw', 'lawn')).toBe(2);
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', '')).toBe(3);
    expect(levenshtein('same', 'same')).toBe(0);
  });

  it('works on Arabic letters', () => {
    const word = heard('1:6', 3);
    expect(levenshtein(word, word.replace('\u{0642}', '\u{0643}'))).toBe(1);
  });
});

describe('unitDistance', () => {
  it('skips optional units for free in either direction', () => {
    const alamin = analyzeWord(uthmani('1:2', 4));
    expect(unitDistance(alamin.units, alamin.full)).toBe(0);
    expect(unitDistance(alamin.units, alamin.key)).toBe(0);
  });

  it('still charges for required letters', () => {
    const alamin = analyzeWord(uthmani('1:2', 4));
    expect(unitDistance(alamin.units, alamin.key.slice(0, -1))).toBe(1);
  });

  it('accepts either letter of a two-way unit', () => {
    const word = analyzeWord('\u{0648}\u{0670}');
    expect(word.units[0].alts).toBe('\u{0648}\u{0627}');
    expect(unitDistance(word.units, '\u{0648}')).toBe(0);
    expect(unitDistance(word.units, '\u{0627}')).toBe(0);
  });
});

describe('alignUnits', () => {
  it('reports a substitution on the letters that changed', () => {
    const sirat = analyzeWord(uthmani('1:6', 2));
    const said = sirat.full.replace('\u{0635}', '\u{0633}').replace('\u{0637}', '\u{062A}');
    const { distance, ops, inserted } = alignUnits(sirat.units, said);
    expect(distance).toBe(2);
    expect(inserted).toBe(0);
    expect(ops).toEqual(['ok', 'ok', 'sub', 'ok', 'ok', 'sub']);
  });

  it('reports a deleted letter', () => {
    const mustaqim = analyzeWord(uthmani('1:6', 3));
    const said = mustaqim.full.replace('\u{0642}', '');
    const { ops } = alignUnits(mustaqim.units, said);
    expect(ops.filter((op) => op === 'del')).toHaveLength(1);
    expect(ops[mustaqim.full.indexOf('\u{0642}')]).toBe('del');
  });

  it('marks an unused optional unit as skipped and counts inserted letters', () => {
    const rahman = analyzeWord(uthmani('1:1', 3));
    const result = alignUnits(rahman.units, `${rahman.key}\u{0646}`);
    expect(result.ops).toContain('skip');
    expect(result.inserted).toBe(1);
    expect(result.distance).toBe(1);
  });
});
