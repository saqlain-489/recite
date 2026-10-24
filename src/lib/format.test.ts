import { describe, expect, it } from 'vitest';
import { arabicNumber, percent, plural, scoreTone } from './format';

describe('format helpers', () => {
  it('writes verse numbers in Arabic-Indic digits', () => {
    expect(arabicNumber(7)).toBe('\u{0667}');
    expect(arabicNumber(286)).toBe('\u{0662}\u{0668}\u{0666}');
  });

  it('formats scores', () => {
    expect(percent(0.666)).toBe('67%');
    expect(percent(undefined)).toBe('0%');
    expect([95, 70, 45, 10].map(scoreTone)).toEqual(['great', 'good', 'fair', 'poor']);
    expect(plural(1, 'item')).toBe('1 item');
    expect(plural(3, 'item')).toBe('3 items');
  });
});
