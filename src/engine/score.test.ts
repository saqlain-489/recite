import { describe, expect, it } from 'vitest';
import { expectedSurah } from '../test/expected';
import { spoken, spokenSurah } from '../test/quran';
import { createState, finalize, ingest } from './matcher';
import { summarize } from './score';

describe('summarize', () => {
  const fatiha = expectedSurah(1);
  const at = (key: string, position: number) => fatiha.findIndex((w) => w.verseKey === key && w.position === position);

  it('scores a clean recitation 100 with no mistakes', () => {
    const state = finalize(ingest(createState(fatiha), fatiha, spokenSurah(1)), fatiha);
    expect(summarize(state, fatiha)).toMatchObject({
      total: 29,
      correct: 29,
      substituted: 0,
      missed: 0,
      extra: 0,
      score: 100,
      mistakes: [],
      unreachedFrom: null,
    });
  });

  it('lists mistakes in reading order with what was expected and heard', () => {
    const words = spokenSurah(1);
    const sub = at('1:6', 2);
    const slip = at('1:7', 9);
    const skip = at('1:5', 3);
    const repeat = at('1:7', 1);
    words[sub] = words[sub].replace('\u{0635}', '\u{0633}').replace('\u{0637}', '\u{062A}');
    words[slip] = words[slip].replace('\u{0636}', '\u{062F}');
    const said = words.flatMap((w, i) => (i === skip ? [] : i === repeat ? [w, w] : [w]));

    const summary = summarize(finalize(ingest(createState(fatiha), fatiha, said), fatiha), fatiha);
    expect(summary.mistakes.map((m) => [m.kind, m.verseKey])).toEqual([
      ['missed', '1:5'],
      ['substituted', '1:6'],
      ['extra', '1:7'],
      ['slip', '1:7'],
    ]);
    expect(summary.mistakes[1]).toMatchObject({ expected: fatiha[sub].text, spoken: words[sub] });
    expect(summary.mistakes[2]).toMatchObject({ repeat: true, index: repeat });
    expect(summary).toMatchObject({ total: 29, correct: 27, substituted: 1, missed: 1, extra: 1, slips: 1, score: 93 });
  });

  it('counts words never reached and says where recitation stopped', () => {
    const half = at('1:5', 1);
    const state = finalize(ingest(createState(fatiha), fatiha, spokenSurah(1).slice(0, half)), fatiha);
    const summary = summarize(state, fatiha);
    expect(summary.unreached).toBe(29 - half);
    expect(summary.unreachedFrom).toBe('1:5');
    expect(summary.mistakes).toEqual([]);
    expect(summary.score).toBe(Math.round((half / 29) * 100));
  });

  it('leaves the optional Bismillah out of the total', () => {
    const ikhlas = expectedSurah(112);
    const state = finalize(ingest(createState(ikhlas), ikhlas, spokenSurah(112)), ikhlas);
    expect(summarize(state, ikhlas)).toMatchObject({ total: ikhlas.length - 4, score: 100 });
  });

  it('labels extra words said before the first word with its verse', () => {
    const ikhlas = expectedSurah(112);
    const stray = spoken('114:4', 3)[0];
    const words = spokenSurah(112);
    const state = finalize(ingest(createState(ikhlas), ikhlas, [words[0], stray, ...words.slice(1)]), ikhlas);
    const [extra] = summarize(state, ikhlas).mistakes;
    expect(extra).toMatchObject({ kind: 'extra', verseKey: '112:1', spoken: stray });
  });
});
