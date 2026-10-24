import { describe, expect, it } from 'vitest';
import { allBundledWords, uthmani } from '../test/quran';
import { ZWJ, joinsAcross } from './arabic';
import { letterGroups, letterRuns, worstStatus } from './letters';
import { analyzeWord } from './normalize';

const strip = (text: string) => text.replaceAll(ZWJ, '');

describe('worstStatus', () => {
  it('ranks a missing letter above a wrong one above a correct one', () => {
    expect(worstStatus(['ok', 'sub', 'del'])).toBe('del');
    expect(worstStatus(['ok', 'sub'])).toBe('sub');
    expect(worstStatus(['ok', 'ok'])).toBe('ok');
    expect(worstStatus([])).toBe('ok');
  });
});

describe('letterGroups', () => {
  it('colours only the letter groups that were said differently', () => {
    const sirat = analyzeWord(uthmani('1:6', 2));
    const said = sirat.full.replace('\u{0635}', '\u{0633}').replace('\u{0637}', '\u{062A}');
    const groups = letterGroups(sirat, said);
    expect(groups.map((g) => g.status)).toEqual(['ok', 'ok', 'sub', 'ok', 'sub']);
    expect(groups.map((g) => g.text).join('')).toBe(sirat.text);
  });

  it('gives a group the worst status of its letters', () => {
    const word = analyzeWord('\u{0648}\u{0670}');
    expect(letterGroups(word, '\u{0628}')).toEqual([{ text: word.text, status: 'sub' }]);
  });

  it('does not flag an optional letter that was left out', () => {
    const rahman = analyzeWord(uthmani('1:1', 3));
    expect(letterGroups(rahman, rahman.key).every((g) => g.status === 'ok')).toBe(true);
  });

  it('marks every group of a missed word', () => {
    const word = analyzeWord(uthmani('112:1', 4));
    expect(letterGroups(word, null).every((g) => g.status === 'del')).toBe(true);
  });

  it('flags the group of a dropped letter', () => {
    const mustaqim = analyzeWord(uthmani('1:6', 3));
    const groups = letterGroups(mustaqim, mustaqim.key.replace('\u{0642}', ''));
    const flagged = groups.filter((g) => g.status !== 'ok');
    expect(flagged).toHaveLength(1);
    expect(flagged[0].status).toBe('del');
    expect(flagged[0].text.startsWith('\u{0642}')).toBe(true);
  });
});

describe('letterRuns', () => {
  it('merges neighbouring groups that share a status', () => {
    const word = analyzeWord(uthmani('112:2', 2));
    const runs = letterRuns(letterGroups(word, word.key));
    expect(runs).toEqual([{ text: word.text, status: 'ok' }]);
  });

  it('adds joiners only where the letters connect', () => {
    const sirat = analyzeWord(uthmani('1:6', 2));
    const said = sirat.full.replace('\u{0635}', '\u{0633}').replace('\u{0637}', '\u{062A}');
    const runs = letterRuns(letterGroups(sirat, said));
    expect(runs.map((r) => r.status)).toEqual(['ok', 'sub', 'ok', 'sub']);
    expect(runs[0].text.endsWith(ZWJ)).toBe(true);
    expect(runs[1].text.startsWith(ZWJ) && runs[1].text.endsWith(ZWJ)).toBe(true);
    expect(runs[2].text.endsWith(ZWJ)).toBe(false);
    expect(runs.map((r) => strip(r.text)).join('')).toBe(sirat.text);
  });

  it('can leave joiners out', () => {
    const sirat = analyzeWord(uthmani('1:6', 2));
    const runs = letterRuns(letterGroups(sirat, null), false);
    expect(runs).toEqual([{ text: sirat.text, status: 'del' }]);
  });

  it('never changes the visible text of any bundled word', () => {
    for (const w of allBundledWords()) {
      const form = analyzeWord(w.text_uthmani);
      const said = form.key.split('').reverse().join('');
      expect(letterRuns(letterGroups(form, said)).map((r) => strip(r.text)).join('')).toBe(w.text_uthmani);
    }
  });
});

describe('joinsAcross', () => {
  it('knows which letters connect to the next one', () => {
    expect(joinsAcross('\u{0644}', '\u{0635}')).toBe(true);
    expect(joinsAcross('\u{0631}', '\u{0637}')).toBe(false);
    expect(joinsAcross('\u{0627}', '\u{0628}')).toBe(false);
    expect(joinsAcross('\u{0628}\u{064E}', '\u{0627}')).toBe(true);
    expect(joinsAcross('\u{0645}\u{0640}\u{0670}', '\u{0646}')).toBe(true);
    expect(joinsAcross('\u{0628}', '\u{0621}')).toBe(false);
  });
});
