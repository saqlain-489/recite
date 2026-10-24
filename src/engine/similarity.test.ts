import { describe, expect, it } from 'vitest';
import { spoken, uthmani } from '../test/quran';
import { analyzeWord, normalizeSpoken } from './normalize';
import { CORRECT_THRESHOLD, MATCH_THRESHOLD, MIN_WORD_LENGTH, similarity } from './similarity';

const heard = (key: string, position: number) => normalizeSpoken(spoken(key, position).join(''));
const form = (key: string, position: number) => analyzeWord(uthmani(key, position));

describe('similarity', () => {
  it('keeps the thresholds of the original matcher', () => {
    expect(CORRECT_THRESHOLD).toBe(0.7);
    expect(MATCH_THRESHOLD).toBe(0.55);
    expect(MIN_WORD_LENGTH).toBe(2);
  });

  it('scores an exact standard spelling as 1', () => {
    expect(similarity(heard('1:4', 1), form('1:4', 1))).toBe(1);
    expect(similarity(heard('109:1', 2), form('109:1', 2))).toBe(1);
  });

  it('scores a long-vowel spelling difference as 0.95', () => {
    const malik = form('114:2', 1);
    expect(malik.key).toHaveLength(3);
    const withAlef = malik.key.slice(0, 1) + '\u{0627}' + malik.key.slice(1);
    expect(similarity(withAlef, malik)).toBe(0.95);
  });

  it('scores a word one letter short at the end as 0.9', () => {
    const mustaqim = form('1:6', 3);
    expect(similarity(mustaqim.key.slice(0, -1), mustaqim)).toBe(0.9);
  });

  it('falls back to the Levenshtein ratio', () => {
    const sirat = form('1:6', 2);
    const said = sirat.full.replace('\u{0635}', '\u{0633}').replace('\u{0637}', '\u{062A}');
    const score = similarity(said, sirat);
    expect(score).toBeCloseTo(4 / 6, 5);
    expect(score).toBeGreaterThanOrEqual(MATCH_THRESHOLD);
    expect(score).toBeLessThan(CORRECT_THRESHOLD);
  });

  it('keeps a one-letter slip above the correct threshold', () => {
    const dallin = form('1:7', 9);
    const said = dallin.key.replace('\u{0636}', '\u{062F}');
    expect(similarity(said, dallin)).toBeGreaterThanOrEqual(CORRECT_THRESHOLD);
  });

  it('scores unrelated words low and empty input as 0', () => {
    expect(similarity(heard('114:1', 1), form('1:6', 3))).toBeLessThan(MATCH_THRESHOLD);
    expect(similarity('', form('1:1', 1))).toBe(0);
  });
});
