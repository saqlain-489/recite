import { unitDistance } from './editDistance';
import type { WordForm } from './normalize';

export const CORRECT_THRESHOLD = 0.7;
export const MATCH_THRESHOLD = 0.55;
export const MIN_WORD_LENGTH = 2;

const ALEF = /\u{0627}/gu;

// `spoken` must already be normalised with normalizeSpoken.
export function similarity(spoken: string, expected: WordForm): number {
  if (!spoken || expected.units.length === 0) return 0;
  const distance = unitDistance(expected.units, spoken);
  if (distance === 0) return 1;

  // Same consonant skeleton once every alef is dropped: a long-vowel spelling difference, not a new word.
  const spokenSkeleton = spoken.replace(ALEF, '');
  if (spokenSkeleton.length >= 2 && spokenSkeleton === expected.key.replace(ALEF, '')) return 0.95;

  const key = expected.key;
  const [shorter, longer] = spoken.length < key.length ? [spoken, key] : [key, spoken];
  if (
    longer.length - shorter.length === 1 &&
    shorter.length >= 4 &&
    shorter.slice(0, 2) === longer.slice(0, 2) &&
    longer.includes(shorter)
  ) {
    return 0.9;
  }

  const maxLength = Math.max(spoken.length, key.length);
  return Math.max(0, (maxLength - distance) / maxLength);
}
