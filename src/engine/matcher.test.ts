import { describe, expect, it } from 'vitest';
import { expectedSurah, expectedWords } from '../test/expected';
import { spoken, spokenBismillah, spokenSurah, spokenVerse, uthmani } from '../test/quran';
import { createState, currentIndex, finalize, ingest, type ExpectedWord, type MatchState } from './matcher';

const BUNDLED = [1, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114];

function recite(expected: readonly ExpectedWord[], ...segments: string[][]): MatchState {
  const live = segments.reduce((state, tokens) => ingest(state, expected, tokens), createState(expected));
  return finalize(live, expected);
}

const statuses = (state: MatchState) => state.words.map((w) => w.status);
const indexOf = (expected: readonly ExpectedWord[], key: string, position: number) =>
  expected.findIndex((w) => w.verseKey === key && w.position === position);

describe('a clean recitation', () => {
  it.each(BUNDLED)('marks every word of surah %i correct from standard spelling', (id) => {
    const expected = expectedSurah(id);
    const state = recite(expected, spokenSurah(id));
    const required = expected.filter((w) => !w.optional).map((w) => w.index);
    expect(required.map((i) => state.words[i].status).every((s) => s === 'correct')).toBe(true);
    expect(state.extras).toEqual([]);
  });

  it('accepts the Bismillah before a surah and never counts it as missed', () => {
    const expected = expectedSurah(112);
    const withIt = recite(expected, [...spokenBismillah(), ...spokenSurah(112)]);
    const withoutIt = recite(expected, spokenSurah(112));
    expect(statuses(withIt).every((s) => s === 'correct')).toBe(true);
    expect(statuses(withoutIt).slice(0, 4)).toEqual(['pending', 'pending', 'pending', 'pending']);
    expect(statuses(withoutIt).slice(4).every((s) => s === 'correct')).toBe(true);
  });

  it('drops the ta`awwudh said before starting', () => {
    const expected = expectedSurah(113);
    const state = recite(expected, ['أعوذ', 'بالله', 'من', 'الشيطان', 'الرجيم'], spokenBismillah(), spokenSurah(113));
    expect(statuses(state).every((s) => s === 'correct')).toBe(true);
    expect(state.extras).toEqual([]);
  });

  it('joins words that standard spelling writes apart', () => {
    const expected = expectedSurah(109, 1, 1);
    const state = recite(expected, spokenVerse('109:1'));
    const yaAyyuha = indexOf(expected, '109:1', 2);
    expect(spoken('109:1', 2)).toHaveLength(2);
    expect(state.words[yaAyyuha]).toMatchObject({ status: 'correct', spoken: spoken('109:1', 2).join(' ') });
  });

  it('lets two identical words in a row both match', () => {
    const naas = uthmani('114:1', 4);
    const expected = expectedWords([naas, naas, uthmani('114:2', 1)]);
    const said = [spoken('114:1', 4)[0], spoken('114:1', 4)[0], spoken('114:2', 1)[0]];
    expect(statuses(recite(expected, said))).toEqual(['correct', 'correct', 'correct']);
  });

  it('ignores one-letter fragments', () => {
    const expected = expectedSurah(112, 1, 1);
    const [a, ...rest] = spokenVerse('112:1');
    const state = recite(expected, [a, '\u{0648}', ...rest]);
    expect(state.extras).toEqual([]);
    expect(statuses(state).slice(4).every((s) => s === 'correct')).toBe(true);
  });
});

describe('mistakes', () => {
  const fatiha = expectedSurah(1);
  const said = spokenSurah(1);

  it('marks a word said with two letters changed as substituted', () => {
    const at = indexOf(fatiha, '1:6', 2);
    const words = [...said];
    words[at] = words[at].replace('\u{0635}', '\u{0633}').replace('\u{0637}', '\u{062A}');
    const state = recite(fatiha, words);
    expect(state.words[at]).toMatchObject({ status: 'substituted', spoken: words[at] });
    expect(statuses(state).filter((s) => s !== 'correct')).toEqual(['substituted']);
  });

  it('keeps a one-letter slip correct but remembers what was heard', () => {
    const at = indexOf(fatiha, '1:7', 9);
    const words = [...said];
    words[at] = words[at].replace('\u{0636}', '\u{062F}');
    const state = recite(fatiha, words);
    expect(state.words[at].status).toBe('correct');
    expect(state.words[at].score).toBeLessThan(1);
  });

  it('marks a skipped word as missed', () => {
    const at = indexOf(fatiha, '1:5', 3);
    const state = recite(fatiha, said.filter((_, i) => i !== at));
    expect(state.words[at].status).toBe('missed');
    expect(statuses(state).filter((s) => s !== 'correct')).toEqual(['missed']);
  });

  it('marks words skipped beyond the lookahead window as missed', () => {
    const from = indexOf(fatiha, '1:4', 1);
    const to = indexOf(fatiha, '1:6', 1);
    const state = recite(fatiha, [...said.slice(0, from), ...said.slice(to)]);
    expect(statuses(state).slice(from, to).every((s) => s === 'missed')).toBe(true);
    expect(statuses(state).slice(to).every((s) => s === 'correct')).toBe(true);
  });

  it('records a word that matches nothing as extra after the word before it', () => {
    const at = indexOf(fatiha, '1:2', 2);
    const stray = spoken('114:4', 3)[0];
    const state = recite(fatiha, [...said.slice(0, at + 1), stray, ...said.slice(at + 1)]);
    expect(state.extras).toEqual([{ spoken: stray, heard: expect.any(String), afterIndex: at, repeat: false }]);
    expect(statuses(state).every((s) => s === 'correct')).toBe(true);
  });

  it('flags a repeated word as a repeat instead of jumping ahead', () => {
    const naas = expectedSurah(114);
    const words = spokenSurah(114);
    const end = indexOf(naas, '114:1', 4);
    const said = end - naas.filter((w) => w.optional).length;
    const state = recite(naas, [...words.slice(0, said + 1), words[said], ...words.slice(said + 1)]);
    expect(state.extras).toMatchObject([{ afterIndex: end, repeat: true }]);
    expect(statuses(state).filter((_, i) => !naas[i].optional).every((s) => s === 'correct')).toBe(true);
  });

  it('reads an unrelated word in place of another as a substitution, not a miss plus an extra', () => {
    const at = indexOf(fatiha, '1:5', 2);
    const words = [...said];
    words[at] = spoken('114:4', 3)[0];
    const state = recite(fatiha, words);
    expect(state.words[at]).toMatchObject({ status: 'substituted', spoken: words[at] });
    expect(state.extras).toEqual([]);
  });

  it('marks words never reached when recitation stops early', () => {
    const half = indexOf(fatiha, '1:5', 1);
    const state = recite(fatiha, said.slice(0, half));
    expect(statuses(state).slice(half).every((s) => s === 'unreached')).toBe(true);
    expect(statuses(state).slice(0, half).every((s) => s === 'correct')).toBe(true);
  });

  it('keeps words heard after the last word as extras', () => {
    const state = recite(fatiha, [...said, said[said.length - 1]]);
    expect(state.extras).toHaveLength(1);
  });
});

describe('streaming', () => {
  const fatiha = expectedSurah(1);
  const verses = ['1:1', '1:2', '1:3', '1:4', '1:5', '1:6', '1:7'].map(spokenVerse);

  it('gives the same result for one transcript or one segment per verse', () => {
    expect(recite(fatiha, ...verses)).toEqual(recite(fatiha, verses.flat()));
  });

  it('never changes the committed state when previewing interim words', () => {
    const committed = ingest(createState(fatiha), fatiha, verses[0]);
    const snapshot = structuredClone(committed);
    const preview = ingest(committed, fatiha, verses[1]);
    expect(committed).toEqual(snapshot);
    expect(preview.cursor).toBeGreaterThan(committed.cursor);
  });

  it('recovers when an interim guess is revised by the final result', () => {
    const committed = ingest(createState(fatiha), fatiha, verses[0]);
    const wrongGuess = ingest(committed, fatiha, [spoken('114:4', 3)[0]]);
    expect(wrongGuess.unplaced).toHaveLength(1);
    const final = finalize(ingest(committed, fatiha, verses.slice(1).flat()), fatiha);
    expect(statuses(final).every((s) => s === 'correct')).toBe(true);
  });

  it('points at the next word to recite', () => {
    const state = ingest(createState(fatiha), fatiha, verses[0]);
    expect(currentIndex(state)).toBe(indexOf(fatiha, '1:2', 1));
    expect(currentIndex(createState(fatiha))).toBe(0);
  });

  it('ignores input once finished', () => {
    const done = finalize(createState(fatiha), fatiha);
    expect(ingest(done, fatiha, verses[0])).toBe(done);
    expect(finalize(done, fatiha)).toBe(done);
  });
});
