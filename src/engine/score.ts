import { hasLetterSlip } from './letters';
import type { ExpectedWord, MatchState } from './matcher';

export type MistakeKind = 'substituted' | 'missed' | 'extra' | 'slip';

export interface Mistake {
  readonly kind: MistakeKind;
  // Expected word index; for an extra word, the index of the word it came after (-1 before the first).
  readonly index: number;
  readonly verseKey: string;
  readonly expected?: string;
  readonly spoken?: string;
  readonly score?: number;
  readonly repeat?: boolean;
}

export interface Summary {
  readonly total: number;
  readonly correct: number;
  readonly substituted: number;
  readonly missed: number;
  readonly unreached: number;
  readonly extra: number;
  readonly slips: number;
  readonly score: number;
  readonly mistakes: readonly Mistake[];
  readonly unreachedFrom: string | null;
}

export function summarize(state: MatchState, expected: readonly ExpectedWord[]): Summary {
  const counts = { total: 0, correct: 0, substituted: 0, missed: 0, unreached: 0, slips: 0 };
  const mistakes: Mistake[] = [];
  let unreachedFrom: string | null = null;

  const extrasAfter = (index: number) => {
    for (const extra of state.extras) {
      if (extra.afterIndex !== index) continue;
      mistakes.push({
        kind: 'extra',
        index,
        verseKey: expected[Math.max(index, 0)]?.verseKey ?? '',
        spoken: extra.spoken,
        repeat: extra.repeat,
      });
    }
  };

  extrasAfter(-1);
  expected.forEach((word, i) => {
    const match = state.words[i];
    if (!word.optional) {
      counts.total++;
      const base = { index: i, verseKey: word.verseKey, expected: word.text };
      switch (match.status) {
        case 'correct':
          counts.correct++;
          if (match.heard && match.score !== 1 && hasLetterSlip(word.form, match.heard)) {
            counts.slips++;
            mistakes.push({ ...base, kind: 'slip', spoken: match.spoken, score: match.score });
          }
          break;
        case 'substituted':
          counts.substituted++;
          mistakes.push({ ...base, kind: 'substituted', spoken: match.spoken, score: match.score });
          break;
        case 'missed':
          counts.missed++;
          mistakes.push({ ...base, kind: 'missed' });
          break;
        case 'unreached':
          counts.unreached++;
          unreachedFrom ??= word.verseKey;
          break;
        case 'pending':
          break;
      }
    }
    extrasAfter(i);
  });

  const extra = state.extras.length;
  const score = counts.total === 0 ? 0 : Math.round((counts.correct / counts.total) * 100);
  return { ...counts, extra, score, mistakes, unreachedFrom };
}
