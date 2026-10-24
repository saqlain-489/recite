import { describe, expect, it } from 'vitest';
import { expectedSamples } from '../test/expected';
import { spokenVerse, verse } from '../test/quran';
import { createState, finalize, ingest } from './matcher';
import { MUQATTAAT_FORMS, collapseMuqattaat, muqattaatAt } from './muqattaat';
import { analyzeWord, normalizeSpoken } from './normalize';

describe('muqattaatAt', () => {
  it('finds the letters only at the start of the surahs that have them', () => {
    expect(muqattaatAt(2, 1, 1)).toBe('الم');
    expect(muqattaatAt(19, 1, 1)).toBe('كهيعص');
    expect(muqattaatAt(42, 2, 1)).toBe('عسق');
    expect(muqattaatAt(2, 1, 2)).toBeNull();
    expect(muqattaatAt(2, 2, 1)).toBeNull();
    expect(muqattaatAt(1, 1, 1)).toBeNull();
    expect(MUQATTAAT_FORMS.size).toBe(14);
  });

  it('agrees with the normalised Uthmani text of every opening sample', () => {
    for (const key of ['2:1', '7:1', '19:1', '20:1', '26:1', '36:1', '38:1', '42:1', '42:2', '50:1', '68:1']) {
      const [surah, ayah] = key.split(':').map(Number);
      expect(analyzeWord(verse(key).words[0].text_uthmani).key, key).toBe(muqattaatAt(surah, ayah, 1));
    }
  });
});

describe('collapseMuqattaat', () => {
  const next = normalizeSpoken(spokenVerse('2:2')[0]);
  const nextForm = analyzeWord(verse('2:2').words[0].text_uthmani);

  it('rewrites letters spelled out by name', () => {
    expect(collapseMuqattaat(['الف', 'لام', 'ميم', next], 0, 'الم')).toEqual({ replacement: ['الم'], consumed: 3 });
    expect(collapseMuqattaat(['الف', 'لام', 'ميم', 'صاد'], 0, 'المص')).toEqual({ replacement: ['المص'], consumed: 4 });
    expect(collapseMuqattaat(['يا', 'سين'], 0, 'يس')).toEqual({ replacement: ['يس'], consumed: 2 });
  });

  it('matches the short forms the original word-boundary patterns never caught', () => {
    expect(collapseMuqattaat(['الف', 'لم', next], 0, 'الم')).toEqual({ replacement: ['الم'], consumed: 2 });
    expect(collapseMuqattaat(['اللام', next], 0, 'الم')).toEqual({ replacement: ['الم'], consumed: 1 });
  });

  it('reads "allam ra" as alif lam ra, not alif lam mim', () => {
    expect(collapseMuqattaat(['اللام', 'را'], 0, 'الر')).toEqual({ replacement: ['الر'], consumed: 2 });
  });

  it('accepts letter names written with a final hamza', () => {
    expect(collapseMuqattaat(['طاء', 'هاء'], 0, 'طه')).toEqual({ replacement: ['طه'], consumed: 2 });
  });

  it('rebuilds longer sequences from letter names when the surah is known', () => {
    expect(collapseMuqattaat(['كاف', 'ها', 'يا', 'عين', 'صاد'], 0, 'كهيعص')).toEqual({
      replacement: ['كهيعص'],
      consumed: 5,
    });
    expect(collapseMuqattaat(['عين', 'سين', 'قاف'], 0, 'عسق')).toEqual({ replacement: ['عسق'], consumed: 3 });
    expect(collapseMuqattaat(['قاف'], 0, 'ق')).toEqual({ replacement: ['ق'], consumed: 1 });
  });

  it('repairs a garbled first word and splits one glued to the next word', () => {
    expect(collapseMuqattaat(['المر', next], 0, 'الم', nextForm)).toEqual({ replacement: ['الم'], consumed: 1 });
    expect(collapseMuqattaat([`الم${next}`], 0, 'الم', nextForm)).toEqual({ replacement: ['الم', next], consumed: 1 });
    expect(collapseMuqattaat([`الم${next}`], 0, 'الم')).toEqual({ replacement: ['الم'], consumed: 1 });
  });

  it('keeps the rest of a word cut by a spelling pattern', () => {
    expect(collapseMuqattaat([`الف`, 'لام', `ميم${next}`], 0, 'الم')).toEqual({ replacement: ['الم', next], consumed: 3 });
  });

  it('leaves correct or unrelated words alone', () => {
    expect(collapseMuqattaat(['الم', next], 0, 'الم')).toBeNull();
    expect(collapseMuqattaat([next], 0, 'الم')).toBeNull();
    expect(collapseMuqattaat([], 0, 'الم')).toBeNull();
  });
});

describe('matching a recitation that opens with disconnected letters', () => {
  it('scores "alif lam mim" as the first word of al-Baqarah', () => {
    const expected = expectedSamples(2);
    const state = finalize(ingest(createState(expected), expected, ['الف', 'لام', 'ميم', ...spokenVerse('2:2')]), expected);
    expect(state.words.map((w) => w.status)).toEqual(expected.map(() => 'correct'));
    expect(state.words[0].spoken).toBe('الف لام ميم');
    expect(state.extras).toEqual([]);
  });

  it('accepts a single-letter opening like qaf', () => {
    const expected = expectedSamples(50);
    const state = finalize(ingest(createState(expected), expected, ['قاف', ...spokenVerse('50:1').slice(1)]), expected);
    expect(state.words.every((w) => w.status === 'correct')).toBe(true);
  });
});
