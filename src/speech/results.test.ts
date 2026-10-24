import { describe, expect, it } from 'vitest';
import { newWords, readResults, type ResultLike } from './results';

const result = (transcript: string, isFinal: boolean): ResultLike => ({ isFinal, 0: { transcript } });

describe('readResults', () => {
  it('sends each final result once and joins the unfinished ones as interim', () => {
    const results = [result('a b', true), result('c', true), result('d', false), result('e', false)];
    expect(readResults(results, 0)).toEqual({ finals: ['a b', 'c'], interim: 'd e', next: 2 });
    expect(readResults(results, 2)).toEqual({ finals: [], interim: 'd e', next: 2 });
  });

  it('waits for results to finish in order', () => {
    const results = [result('a', false), result('b', true)];
    expect(readResults(results, 0)).toEqual({ finals: [], interim: 'a', next: 0 });
  });

  it('skips empty results without stalling', () => {
    const results = [result('  ', true), result('x', true)];
    expect(readResults(results, 0)).toEqual({ finals: ['x'], interim: '', next: 2 });
  });
});

describe('newWords', () => {
  it('drops a repeated session prefix', () => {
    expect(newWords('a b', 'a b c d')).toBe('c d');
  });

  it('keeps segments that do not repeat the previous one', () => {
    expect(newWords('', 'a b')).toBe('a b');
    expect(newWords('a b', 'c d e')).toBe('c d e');
    expect(newWords('a b c', 'a b')).toBe('a b');
  });
});
