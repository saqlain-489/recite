import { describe, expect, it } from 'vitest';
import { createState, finalize, ingest, summarize, tokenize } from '../engine';
import { buildExpected } from '../quran/expected';
import { BISMILLAH, bundledSurah, chapterById } from '../quran/fixture';
import { buildDemoScript, demoVerses, DEMO_WORD_LIMIT } from './script';

const BUNDLED = [1, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114];

function runDemo(id: number) {
  const surah = bundledSurah(id)!;
  const chapter = chapterById(id);
  const expected = buildExpected(surah, chapter, { from: 1, to: chapter.verses_count }, BISMILLAH);
  const script = buildDemoScript(surah.verses, chapter.bismillah_pre ? BISMILLAH : null);
  let state = createState(expected);
  for (const step of script.steps) {
    if (step.kind === 'final') state = ingest(state, expected, tokenize(step.text));
  }
  return { script, expected, summary: summarize(finalize(state, expected), expected) };
}

describe('the sample recitation', () => {
  it.each(BUNDLED)('produces exactly the planned mistakes for surah %i', (id) => {
    const { script, summary } = runDemo(id);
    const planned = [...script.mistakes.values()].sort();
    const found = summary.mistakes.map((m) => (m.kind === 'extra' ? 'repeated' : m.kind)).sort();
    expect(found).toEqual(planned);
    expect(summary.unreached).toBe(0);
  });

  it('shows every kind of mistake on Al-Fatiha', () => {
    const { script, summary } = runDemo(1);
    expect(new Set(script.mistakes.values())).toEqual(new Set(['substituted', 'missed', 'repeated', 'slip']));
    expect(summary).toMatchObject({ substituted: 1, missed: 1, extra: 1, slips: 1 });
  });

  it('grows each verse word by word before sending it as final', () => {
    const { script } = runDemo(112);
    const firstFinal = script.steps.findIndex((s) => s.kind === 'final');
    const interims = script.steps.slice(0, firstFinal);
    expect(interims.length).toBeGreaterThan(1);
    interims.forEach((step, i) => expect(step.text.split(' ')).toHaveLength(i + 1));
    expect(script.steps.map((s) => s.at)).toEqual([...script.steps.map((s) => s.at)].sort((a, b) => a - b));
  });

  it('keeps long passages to whole verses under the word limit', () => {
    const verses = bundledSurah(1)!.verses;
    expect(demoVerses(verses)).toHaveLength(verses.length);
    const long = [...verses, ...verses, ...verses];
    const picked = demoVerses(long);
    expect(picked.reduce((n, v) => n + v.words.length, 0)).toBeLessThanOrEqual(DEMO_WORD_LIMIT);
    expect(picked.length).toBeGreaterThan(0);
  });
});
