import { describe, expect, it } from 'vitest';
import { allBundledWords, imlaei, uthmani } from '../test/quran';
import { analyzeWord, normalizeSpoken, splitGroups, stripMarks, tokenize } from './normalize';
import { similarity } from './similarity';

const TATWEEL = '\u{0640}';
const DAGGER_ALEF = '\u{0670}';

describe('normalizeSpoken', () => {
  it('drops harakat, shadda, sukun and tanween', () => {
    const rabbi = imlaei('1:2', 3);
    expect(rabbi).toMatch(/[\u{064B}-\u{0652}]/u);
    expect(normalizeSpoken(rabbi)).toBe(stripMarks(rabbi));
    expect(normalizeSpoken(imlaei('112:1', 4))).toHaveLength(3);
  });

  it('folds every alef form into a bare alef', () => {
    expect(normalizeSpoken('\u{0623}\u{0625}\u{0622}\u{0671}\u{0627}')).toBe('\u{0627}'.repeat(5));
  });

  it('folds hamza carriers and standalone hamza', () => {
    expect(normalizeSpoken('\u{0624}')).toBe('\u{0648}');
    expect(normalizeSpoken('\u{0626}')).toBe('\u{064A}');
    expect(normalizeSpoken('\u{0621}')).toBe('\u{0627}');
  });

  it('treats ta marbuta as ha and alef maksura as ya', () => {
    const rihla = stripMarks(imlaei('106:2', 2));
    expect(rihla.endsWith('\u{0629}')).toBe(true);
    expect(normalizeSpoken(rihla)).toBe(normalizeSpoken(rihla.replace('\u{0629}', '\u{0647}')));
    expect(normalizeSpoken('\u{0649}')).toBe(normalizeSpoken('\u{064A}'));
  });

  it('removes tatweel stretching', () => {
    const word = stripMarks(imlaei('1:2', 1));
    const stretched = word.slice(0, 3) + TATWEEL.repeat(4) + word.slice(3);
    expect(normalizeSpoken(stretched)).toBe(normalizeSpoken(word));
  });

  it('composes decomposed hamza before folding', () => {
    expect(normalizeSpoken('\u{0627}\u{0654}')).toBe('\u{0627}');
    expect(normalizeSpoken('\u{0648}\u{0654}')).toBe('\u{0648}');
  });

  it('keeps only full letters on the spoken side', () => {
    expect(normalizeSpoken(`\u{0647}\u{06E5}`)).toBe('\u{0647}');
    expect(normalizeSpoken(`\u{0645}${DAGGER_ALEF}`)).toBe('\u{0645}');
    expect(normalizeSpoken('abc 123 \u{0661}')).toBe('');
  });
});

describe('tokenize', () => {
  it('splits on spaces and Arabic or Latin punctuation and drops non-Arabic text', () => {
    const [a, b, c] = [imlaei('1:2', 1), imlaei('1:2', 2), imlaei('1:2', 3)];
    expect(tokenize(`${a}\u{060C} ${b}\u{061F} hello 42 ${c}.`)).toEqual([a, b, c].map(stripMarks));
  });

  it('returns nothing for an empty or Latin-only transcript', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('   ok, thanks  ')).toEqual([]);
  });
});

describe('splitGroups', () => {
  it('keeps each base letter with its marks and loses nothing', () => {
    for (const w of allBundledWords()) {
      const groups = splitGroups(w.text_uthmani);
      expect(groups.join('')).toBe(w.text_uthmani);
    }
  });

  it('attaches tatweel and the dagger alef to the letter before them', () => {
    const rahman = uthmani('1:1', 3);
    const groups = splitGroups(rahman);
    expect(groups).toHaveLength(6);
    expect(groups[4]).toContain(TATWEEL);
    expect(groups[4]).toContain(DAGGER_ALEF);
  });

  it('keeps a pause mark that follows a space in its own group', () => {
    const word = uthmani('110:3', 4);
    expect(word).toContain(' ');
    const groups = splitGroups(word);
    expect(groups[groups.length - 1].startsWith(' ')).toBe(true);
  });
});

describe('analyzeWord', () => {
  it('makes the dagger alef optional', () => {
    const form = analyzeWord(uthmani('1:2', 4));
    expect(form.units.filter((u) => u.optional)).toHaveLength(1);
    expect(form.full).toBe(normalizeSpoken(imlaei('1:2', 4)));
    expect(form.key).toHaveLength(form.full.length - 1);
  });

  it('accepts both standard spellings of a dagger alef word', () => {
    const rahman = analyzeWord(uthmani('1:1', 3));
    expect(rahman.key).toBe(normalizeSpoken(imlaei('1:1', 3)));
    expect(rahman.full.length).toBe(rahman.key.length + 1);
  });

  it('makes small waw and small yeh optional', () => {
    const innahu = analyzeWord(uthmani('110:3', 5));
    expect(innahu.units.at(-1)).toMatchObject({ alts: '\u{0648}', optional: true });
    const ilafihim = analyzeWord(uthmani('106:2', 1));
    expect(ilafihim.units[1]).toMatchObject({ alts: '\u{064A}', optional: true });
  });

  it('makes a standalone hamza optional', () => {
    const shitaa = analyzeWord(uthmani('106:2', 3));
    expect(shitaa.units.at(-1)).toMatchObject({ alts: '\u{0627}', optional: true });
  });

  it('ignores Quranic annotation marks', () => {
    for (const [key, position] of [
      ['106:3', 1],
      ['109:4', 2],
      ['105:5', 3],
      ['110:3', 7],
      ['110:3', 4],
    ] as const) {
      const form = analyzeWord(uthmani(key, position));
      expect(form.full).toBe(normalizeSpoken(form.text));
    }
  });

  it('links every unit to the letter group it came from', () => {
    const form = analyzeWord(uthmani('1:6', 2));
    for (const unit of form.units) {
      expect(form.groups[unit.group]).toBeDefined();
    }
    expect(new Set(form.units.map((u) => u.group)).size).toBe(form.groups.length);
  });

  it('matches every bundled Uthmani word against its standard spelling', () => {
    const misses = allBundledWords().filter(
      (w) => similarity(normalizeSpoken(w.text_imlaei.replace(/\s+/g, '')), analyzeWord(w.text_uthmani)) !== 1,
    );
    expect(misses.map((w) => `${w.key}:${w.position}`)).toEqual([]);
  });
});
