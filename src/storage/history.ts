import type { MistakeKind } from '../engine';

export interface AttemptMistake {
  readonly kind: MistakeKind;
  readonly verseKey: string;
  readonly expected?: string;
  readonly spoken?: string;
}

export interface Attempt {
  readonly id: string;
  readonly date: string;
  readonly surahId: number;
  readonly surahName: string;
  readonly from: number;
  readonly to: number;
  readonly source: 'mic' | 'sample';
  readonly score: number;
  readonly total: number;
  readonly correct: number;
  readonly substituted: number;
  readonly missed: number;
  readonly unreached: number;
  readonly extra: number;
  readonly mistakes: readonly AttemptMistake[];
}

export const HISTORY_KEY = 'recite.attempts.v1';
export const HISTORY_LIMIT = 30;
export const MISTAKES_KEPT = 12;

export function browserStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function isAttempt(value: unknown): value is Attempt {
  if (typeof value !== 'object' || value === null) return false;
  const a = value as Partial<Attempt>;
  return (
    typeof a.id === 'string' &&
    typeof a.date === 'string' &&
    typeof a.surahId === 'number' &&
    typeof a.score === 'number' &&
    Array.isArray(a.mistakes)
  );
}

export function loadAttempts(storage: Storage | null = browserStorage()): Attempt[] {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(HISTORY_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isAttempt) : [];
  } catch {
    return [];
  }
}

export function addAttempt(list: readonly Attempt[], attempt: Attempt): Attempt[] {
  const trimmed = { ...attempt, mistakes: attempt.mistakes.slice(0, MISTAKES_KEPT) };
  return [trimmed, ...list.filter((a) => a.id !== attempt.id)].slice(0, HISTORY_LIMIT);
}

export function storeAttempts(list: readonly Attempt[], storage: Storage | null = browserStorage()): void {
  try {
    if (list.length === 0) storage?.removeItem(HISTORY_KEY);
    else storage?.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch {
    // Full or blocked storage: the attempts stay in memory for this visit.
  }
}
