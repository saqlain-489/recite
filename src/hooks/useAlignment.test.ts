import { describe, expect, it } from 'vitest';
import { expectedSurah } from '../test/expected';
import { spokenVerse } from '../test/quran';
import { alignmentReducer, freshAlignment, type AlignmentAction } from './useAlignment';

const fatiha = expectedSurah(1);
const run = (...actions: AlignmentAction[]) => actions.reduce(alignmentReducer, freshAlignment(fatiha));
const text = (key: string) => spokenVerse(key).join(' ');

describe('alignment state', () => {
  it('previews interim words without committing them', () => {
    const state = run({ type: 'interim', text: text('1:1') });
    expect(state.preview.lastMatched).toBe(3);
    expect(state.committed.lastMatched).toBe(-1);
    expect(state.interim).toBe(text('1:1'));
  });

  it('commits final results and clears the interim text', () => {
    const state = run({ type: 'interim', text: text('1:1') }, { type: 'final', text: text('1:1') });
    expect(state.committed.lastMatched).toBe(3);
    expect(state.preview).toBe(state.committed);
    expect(state.finals).toEqual([text('1:1')]);
    expect(state.interim).toBe('');
  });

  it('counts the words still in the interim result when the user stops', () => {
    const state = run({ type: 'final', text: text('1:1') }, { type: 'interim', text: text('1:2') }, { type: 'finish' });
    expect(state.committed.finished).toBe(true);
    expect(state.committed.lastMatched).toBe(7);
    expect(state.finals).toEqual([text('1:1'), text('1:2')]);
  });

  it('ignores results that arrive after finishing', () => {
    const done = run({ type: 'final', text: text('1:1') }, { type: 'finish' });
    expect(alignmentReducer(done, { type: 'final', text: text('1:2') })).toBe(done);
    expect(alignmentReducer(done, { type: 'interim', text: text('1:2') })).toBe(done);
    expect(alignmentReducer(done, { type: 'finish' })).toBe(done);
  });

  it('starts over on reset', () => {
    const state = alignmentReducer(run({ type: 'final', text: text('1:1') }), { type: 'reset', expected: fatiha });
    expect(state.committed.lastMatched).toBe(-1);
    expect(state.finals).toEqual([]);
  });
});
