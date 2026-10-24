import { CORRECT_THRESHOLD, MATCH_THRESHOLD, analyzeWord, normalizeSpoken, similarity, stripMarks } from '../engine';
import type { ScriptStep } from '../speech/scripted';
import type { QuranWord, Verse } from '../quran/types';

export type DemoMistake = 'substituted' | 'missed' | 'repeated' | 'slip';

export interface DemoScript {
  readonly steps: readonly ScriptStep[];
  // Planned mistakes keyed by "surah:verse:position".
  readonly mistakes: ReadonlyMap<string, DemoMistake>;
}

// Letters learners commonly swap for a neighbouring sound.
const CONFUSIONS: Readonly<Record<string, string>> = {
  '\u{0642}': '\u{0643}', // qaf -> kaf
  '\u{0636}': '\u{062F}', // dad -> dal
  '\u{0635}': '\u{0633}', // sad -> sin
  '\u{0637}': '\u{062A}', // emphatic ta -> plain ta
  '\u{0638}': '\u{0632}', // dha -> zay
  '\u{0630}': '\u{0632}', // dhal -> zay
  '\u{062B}': '\u{0633}', // tha -> sin
  '\u{062D}': '\u{0647}', // throaty ha -> plain ha
};

const FIRST_DELAY = 500;
const WORD_MS = 210;
const LETTER_MS = 38;
const FINAL_DELAY = 260;
const VERSE_GAP = 420;
// The word at the cursor gets a 0.03 position bonus, so a substitution must stay below the line even with it.
const SUBSTITUTION_CEILING = CORRECT_THRESHOLD - 0.031;

interface DemoWord {
  readonly key: string;
  readonly uthmani: string;
  said: string[];
}

const spokenWords = (word: QuranWord) => stripMarks(word.text_imlaei).split(' ').filter(Boolean);

function confuse(word: string, count: number): string | null {
  let changed = 0;
  let out = '';
  for (const ch of word) {
    const swap = changed < count ? CONFUSIONS[ch] : undefined;
    if (swap) changed++;
    out += swap ?? ch;
  }
  return changed === count ? out : null;
}

function score(said: string, uthmani: string): number {
  return similarity(normalizeSpoken(said), analyzeWord(uthmani));
}

function planMistakes(words: DemoWord[]): Map<string, DemoMistake> {
  const mistakes = new Map<string, DemoMistake>();
  const used = new Set<number>();
  const n = words.length;
  const free = (i: number) => i > 0 && i < n - 1 && !used.has(i - 1) && !used.has(i) && !used.has(i + 1);
  const pick = (from: number, test: (word: DemoWord, i: number) => boolean) => {
    for (let i = Math.floor(from * n); i < n; i++) if (free(i) && test(words[i], i)) return i;
    return -1;
  };
  const mark = (i: number, kind: DemoMistake, said: string[]) => {
    if (i < 0) return;
    used.add(i);
    words[i].said = said;
    mistakes.set(words[i].key, kind);
  };
  const single = (w: DemoWord) => w.said.length === 1;
  const sameAsNext = (i: number) =>
    i + 1 < n && normalizeSpoken(words[i].said.join('')) === normalizeSpoken(words[i + 1].said.join(''));

  const sub = pick(0.3, (w) => {
    const said = single(w) ? confuse(w.said[0], 2) : null;
    if (!said) return false;
    const s = score(said, w.uthmani);
    return s >= MATCH_THRESHOLD && s < SUBSTITUTION_CEILING;
  });
  mark(sub, 'substituted', sub < 0 ? [] : [confuse(words[sub].said[0], 2) ?? '']);

  if (n >= 8) {
    const miss = pick(0.5, (_, i) => !sameAsNext(i) && !sameAsNext(i - 1));
    mark(miss, 'missed', []);
  }

  if (n >= 12) {
    const repeat = pick(0.68, (w, i) => single(w) && !sameAsNext(i));
    if (repeat >= 0) mark(repeat, 'repeated', [words[repeat].said[0], words[repeat].said[0]]);
  }

  const slip = pick(0.82, (w) => {
    const said = single(w) ? confuse(w.said[0], 1) : null;
    if (!said) return false;
    const s = score(said, w.uthmani);
    return s >= CORRECT_THRESHOLD && s < 1;
  });
  mark(slip, 'slip', slip < 0 ? [] : [confuse(words[slip].said[0], 1) ?? '']);

  return mistakes;
}

function timeline(segments: readonly string[][]): ScriptStep[] {
  const steps: ScriptStep[] = [];
  let at = FIRST_DELAY;
  for (const segment of segments) {
    if (segment.length === 0) continue;
    segment.forEach((word, i) => {
      at += WORD_MS + LETTER_MS * word.length;
      steps.push({ at, kind: 'interim', text: segment.slice(0, i + 1).join(' ') });
    });
    at += FINAL_DELAY;
    steps.push({ at, kind: 'final', text: segment.join(' ') });
    at += VERSE_GAP;
  }
  return steps;
}

// A recogniser-style transcript of the verses (standard spelling, no marks) with a few deliberate mistakes.
export function buildDemoScript(verses: readonly Verse[], bismillah: readonly QuranWord[] | null): DemoScript {
  const byVerse: DemoWord[][] = verses.map((v) =>
    v.words.map((w) => ({ key: `${v.verse_key}:${w.position}`, uthmani: w.text_uthmani, said: spokenWords(w) })),
  );
  const mistakes = planMistakes(byVerse.flat());
  const segments = byVerse.map((words) => words.flatMap((w) => w.said));
  if (bismillah) segments.unshift(bismillah.flatMap(spokenWords));
  return { steps: timeline(segments), mistakes };
}

export const DEMO_WORD_LIMIT = 60;

// Long passages are trimmed to whole verses so the sample stays under a minute.
export function demoVerses(verses: readonly Verse[]): Verse[] {
  const picked: Verse[] = [];
  let words = 0;
  for (const verse of verses) {
    if (picked.length > 0 && words + verse.words.length > DEMO_WORD_LIMIT) break;
    picked.push(verse);
    words += verse.words.length;
  }
  return picked;
}
