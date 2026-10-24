import { describe, expect, it } from 'vitest';
import { HISTORY_KEY, HISTORY_LIMIT, MISTAKES_KEPT, addAttempt, loadAttempts, storeAttempts, type Attempt } from './history';

class MemoryStorage implements Storage {
  private items = new Map<string, string>();
  get length() {
    return this.items.size;
  }
  clear() {
    this.items.clear();
  }
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  key(index: number) {
    return [...this.items.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
  setItem(key: string, value: string) {
    this.items.set(key, value);
  }
}

const attempt = (id: string, score = 80): Attempt => ({
  id,
  date: '2026-10-25T10:00:00.000Z',
  surahId: 1,
  surahName: 'Al-Fatihah',
  from: 1,
  to: 7,
  source: 'sample',
  score,
  total: 29,
  correct: 23,
  substituted: 2,
  missed: 2,
  unreached: 0,
  extra: 1,
  mistakes: Array.from({ length: 20 }, () => ({ kind: 'missed' as const, verseKey: '1:5' })),
});

describe('attempt history', () => {
  it('round-trips attempts through storage, newest first', () => {
    const storage = new MemoryStorage();
    const list = addAttempt(addAttempt([], attempt('a')), attempt('b'));
    storeAttempts(list, storage);
    expect(loadAttempts(storage).map((a) => a.id)).toEqual(['b', 'a']);
  });

  it('keeps a bounded number of attempts and mistakes', () => {
    let list: Attempt[] = [];
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) list = addAttempt(list, attempt(String(i)));
    expect(list).toHaveLength(HISTORY_LIMIT);
    expect(list[0].mistakes).toHaveLength(MISTAKES_KEPT);
  });

  it('ignores corrupt or foreign data', () => {
    const storage = new MemoryStorage();
    storage.setItem(HISTORY_KEY, '{not json');
    expect(loadAttempts(storage)).toEqual([]);
    storage.setItem(HISTORY_KEY, JSON.stringify([{ id: 1 }, attempt('ok')]));
    expect(loadAttempts(storage).map((a) => a.id)).toEqual(['ok']);
  });

  it('survives storage that throws or is missing', () => {
    const broken = new MemoryStorage();
    broken.setItem = () => {
      throw new Error('quota');
    };
    expect(() => storeAttempts([attempt('a')], broken)).not.toThrow();
    expect(loadAttempts(null)).toEqual([]);
  });

  it('removes the key when the list is cleared', () => {
    const storage = new MemoryStorage();
    storeAttempts([attempt('a')], storage);
    storeAttempts([], storage);
    expect(storage.getItem(HISTORY_KEY)).toBeNull();
  });
});
