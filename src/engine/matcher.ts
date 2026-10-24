import { levenshtein } from './editDistance';
import { collapseMuqattaat } from './muqattaat';
import { normalizeSpoken, type WordForm } from './normalize';
import { CORRECT_THRESHOLD, MATCH_THRESHOLD, MIN_WORD_LENGTH, similarity } from './similarity';

export const LOOKAHEAD = 8;
const POSITION_BONUS = [0.03, 0.01];
const FAR_SEARCH_BELOW = 0.8;
const FAR_MATCH_MIN = 0.85;
const FAR_HORIZON = 300;
const MAX_MERGE = 3;
const MERGE_MARGIN = 0.1;
const PAIR_BONUS = 0.5;

export interface ExpectedWord {
  readonly index: number;
  readonly verseKey: string;
  readonly position: number;
  readonly text: string;
  readonly form: WordForm;
  // The Bismillah before a surah: matched when recited, never counted as missed.
  readonly optional: boolean;
  // Normalised disconnected letters when this word is one, e.g. "الم".
  readonly muqattaat: string | null;
}

export type WordStatus = 'pending' | 'correct' | 'substituted' | 'missed' | 'unreached';

export interface Heard {
  readonly spoken: string;
  readonly heard: string;
}

export interface WordMatch {
  readonly status: WordStatus;
  readonly spoken?: string;
  readonly heard?: string;
  readonly score?: number;
}

export interface ExtraWord extends Heard {
  readonly afterIndex: number;
  readonly repeat: boolean;
}

export interface MatchState {
  readonly words: readonly WordMatch[];
  readonly extras: readonly ExtraWord[];
  // Words heard since the last match that have not been placed yet.
  readonly unplaced: readonly Heard[];
  readonly cursor: number;
  readonly lastMatched: number;
  readonly finished: boolean;
}

const PENDING: WordMatch = { status: 'pending' };

export function createState(expected: readonly ExpectedWord[]): MatchState {
  return { words: expected.map(() => PENDING), extras: [], unplaced: [], cursor: 0, lastMatched: -1, finished: false };
}

interface Token {
  readonly raw: string;
  readonly norm: string;
}

interface Candidate {
  readonly index: number;
  readonly score: number;
  readonly adjusted: number;
}

export function ingest(state: MatchState, expected: readonly ExpectedWord[], tokens: readonly string[]): MatchState {
  if (tokens.length === 0 || state.finished) return state;
  const words = state.words.slice();
  const extras = state.extras.slice();
  let unplaced = state.unplaced.slice();
  let { cursor, lastMatched } = state;
  const queue: Token[] = tokens.map((raw) => ({ raw, norm: normalizeSpoken(raw) }));
  let k = 0;

  if (lastMatched === -1) {
    const said = [...unplaced.map((u) => u.heard), ...queue.map((t) => t.norm)];
    const preamble = taawwudhLength(said);
    if (preamble > 0) {
      k = Math.max(0, preamble - unplaced.length);
      unplaced = unplaced.slice(preamble);
    }
  }

  while (k < queue.length) {
    const target = nextRequired(expected, cursor);
    const letters = target === -1 ? null : expected[target].muqattaat;
    if (letters) {
      const collapse = collapseMuqattaat(
        queue.slice(k).map((t) => t.norm),
        0,
        letters,
        expected[target + 1]?.form,
      );
      if (collapse) {
        const raw = queue.slice(k, k + collapse.consumed).map((t) => t.raw).join(' ');
        const replaced = collapse.replacement.map((norm, i) => ({ raw: i === 0 ? raw : norm, norm }));
        queue.splice(k, collapse.consumed, ...replaced);
      }
    }

    const token = queue[k];
    if (token.norm.length < MIN_WORD_LENGTH && token.norm !== letters) {
      k++;
      continue;
    }

    let best = findBest(token.norm, expected, words, cursor, true);
    let take = 1;
    // Standard spelling splits some mushaf words in two, e.g. "ya ayyuha".
    for (let n = 2; n <= MAX_MERGE && k + n <= queue.length; n++) {
      const merged = queue.slice(k, k + n).map((t) => t.norm).join('');
      const candidate = findBest(merged, expected, words, cursor, false);
      if (candidate && candidate.adjusted >= CORRECT_THRESHOLD && candidate.adjusted > (best?.adjusted ?? 0) + MERGE_MARGIN) {
        best = candidate;
        take = n;
      }
    }

    const taken = queue.slice(k, k + take);
    const heard: Heard = { spoken: taken.map((t) => t.raw).join(' '), heard: taken.map((t) => t.norm).join('') };
    k += take;

    const forward = best && best.adjusted >= MATCH_THRESHOLD ? best : null;
    const repeatScore = lastMatched >= 0 ? similarity(heard.heard, expected[lastMatched].form) : 0;
    // Saying the last word again should not jump ahead to the next copy of that word.
    if (repeatScore >= CORRECT_THRESHOLD && (!forward || (forward.index > cursor && repeatScore >= forward.score))) {
      extras.push({ ...heard, afterIndex: lastMatched, repeat: true });
      continue;
    }

    if (forward) {
      placeGap(words, extras, unplaced, expected, cursor, forward.index, lastMatched);
      words[forward.index] = {
        status: forward.adjusted >= CORRECT_THRESHOLD ? 'correct' : 'substituted',
        spoken: heard.spoken,
        heard: heard.heard,
        score: forward.score,
      };
      cursor = forward.index + 1;
      lastMatched = forward.index;
      unplaced = [];
    } else {
      unplaced.push(heard);
    }
  }

  return { words, extras, unplaced, cursor, lastMatched, finished: false };
}

export function finalize(state: MatchState, expected: readonly ExpectedWord[]): MatchState {
  if (state.finished) return state;
  const words = state.words.map((w, i) =>
    w.status === 'pending' && !expected[i].optional ? { status: 'unreached' as const } : w,
  );
  const leftovers =
    state.lastMatched >= 0 ? state.unplaced.map((u) => ({ ...u, afterIndex: state.lastMatched, repeat: false })) : [];
  return { ...state, words, extras: [...state.extras, ...leftovers], unplaced: [], finished: true };
}

export function currentIndex(state: MatchState): number {
  for (let i = state.cursor; i < state.words.length; i++) {
    if (state.words[i].status === 'pending') return i;
  }
  return -1;
}

function nextRequired(expected: readonly ExpectedWord[], from: number): number {
  for (let i = from; i < expected.length; i++) if (!expected[i].optional) return i;
  return -1;
}

function findBest(
  heard: string,
  expected: readonly ExpectedWord[],
  words: readonly WordMatch[],
  cursor: number,
  searchFar: boolean,
): Candidate | null {
  let best: Candidate | null = null;
  const end = Math.min(expected.length, cursor + LOOKAHEAD);
  for (let i = cursor; i < end; i++) {
    if (words[i].status !== 'pending') continue;
    const score = similarity(heard, expected[i].form);
    const adjusted = score + (POSITION_BONUS[i - cursor] ?? 0);
    if (!best || adjusted > best.adjusted) best = { index: i, score, adjusted };
  }
  if (searchFar && (!best || best.adjusted < FAR_SEARCH_BELOW)) {
    const limit = Math.min(expected.length, cursor + FAR_HORIZON);
    for (let i = end; i < limit; i++) {
      const score = similarity(heard, expected[i].form);
      if (score >= FAR_MATCH_MIN && (!best || score > best.adjusted)) best = { index: i, score, adjusted: score };
    }
  }
  return best;
}

// Words skipped between two matches are aligned with the words heard in that gap, so "said X instead of Y"
// wins over "missed Y" plus "extra X". Pairs are chosen by a small order-preserving alignment.
function placeGap(
  words: WordMatch[],
  extras: ExtraWord[],
  unplaced: readonly Heard[],
  expected: readonly ExpectedWord[],
  from: number,
  to: number,
  lastMatched: number,
): void {
  const skipped: number[] = [];
  for (let i = from; i < to; i++) {
    if (!expected[i].optional && words[i].status === 'pending') skipped.push(i);
  }
  const n = skipped.length;
  const m = unplaced.length;
  const pairScore = (i: number, j: number) => PAIR_BONUS + similarity(unplaced[j].heard, expected[skipped[i]].form);
  const best = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      best[i][j] = Math.max(best[i - 1][j], best[i][j - 1], best[i - 1][j - 1] + pairScore(i - 1, j - 1));
    }
  }

  const steps: Array<{ word?: number; heard?: Heard }> = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && best[i][j] === best[i - 1][j - 1] + pairScore(i - 1, j - 1)) {
      steps.push({ word: skipped[i - 1], heard: unplaced[j - 1] });
      i--;
      j--;
    } else if (i > 0 && (j === 0 || best[i][j] === best[i - 1][j])) {
      steps.push({ word: skipped[i - 1] });
      i--;
    } else {
      steps.push({ heard: unplaced[j - 1] });
      j--;
    }
  }

  let previous = lastMatched;
  for (const step of steps.reverse()) {
    if (step.word !== undefined && step.heard) {
      const score = similarity(step.heard.heard, expected[step.word].form);
      words[step.word] = { status: 'substituted', spoken: step.heard.spoken, heard: step.heard.heard, score };
      previous = step.word;
    } else if (step.word !== undefined) {
      words[step.word] = { status: 'missed' };
      previous = step.word;
    } else if (step.heard && previous >= 0) {
      // Before the first matched word, unplaced speech is a preamble, not a mistake.
      extras.push({ ...step.heard, afterIndex: previous, repeat: false });
    }
  }
}

const TAAWWUDH = ['اعوذ', 'بالله', 'من', 'الشيطان', 'الرجيم'];

// Many reciters open with the ta'awwudh; it is not part of the surah, so it is dropped before matching starts.
function taawwudhLength(said: readonly string[]): number {
  let next = 0;
  let matched = 0;
  let i = 0;
  for (; i < said.length && next < TAAWWUDH.length; i++) {
    const at = [next, next + 1].find((n) => n < TAAWWUDH.length && close(said[i], TAAWWUDH[n]));
    if (at === undefined) break;
    matched++;
    next = at + 1;
  }
  return matched >= 3 ? i : 0;
}

function close(a: string, b: string): boolean {
  const longest = Math.max(a.length, b.length);
  return longest > 0 && 1 - levenshtein(a, b) / longest >= 0.75;
}
