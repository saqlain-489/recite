import { normalizeSpoken, type WordForm } from './normalize';
import { CORRECT_THRESHOLD, similarity } from './similarity';

// Normalised disconnected letters that open these surahs; 42 also has them as its second verse.
const BY_SURAH: Readonly<Record<number, string>> = {
  2: 'الم', 3: 'الم', 29: 'الم', 30: 'الم', 31: 'الم', 32: 'الم',
  7: 'المص',
  10: 'الر', 11: 'الر', 12: 'الر', 14: 'الر', 15: 'الر',
  13: 'المر',
  19: 'كهيعص',
  20: 'طه',
  26: 'طسم', 28: 'طسم',
  27: 'طس',
  36: 'يس',
  38: 'ص',
  40: 'حم', 41: 'حم', 42: 'حم', 43: 'حم', 44: 'حم', 45: 'حم', 46: 'حم',
  50: 'ق',
  68: 'ن',
};

export const MUQATTAAT_FORMS: ReadonlySet<string> = new Set([...Object.values(BY_SURAH), 'عسق']);

export function muqattaatAt(surah: number, verse: number, position: number): string | null {
  if (position !== 1) return null;
  if (verse === 1) return BY_SURAH[surah] ?? null;
  return surah === 42 && verse === 2 ? 'عسق' : null;
}

// Recognisers spell the letters out by name ("alif lam mim"), so each name maps back to its letter.
const LETTER_NAMES: Readonly<Record<string, string>> = {
  'الف': 'ا', 'اللف': 'ا', 'الا': 'ا',
  'لام': 'ل', 'لم': 'ل',
  'ميم': 'م', 'مي': 'م', 'مين': 'م', 'م': 'م',
  'لامين': 'لم', 'لامم': 'لم', 'لامي': 'لم',
  'اللام': 'الم', 'اللامي': 'الم', 'اللاميم': 'الم',
  'را': 'ر', 'راا': 'ر', 'ري': 'ر',
  'صاد': 'ص', 'صا': 'ص',
  'سين': 'س',
  'طا': 'ط', 'طاا': 'ط',
  'ها': 'ه', 'هاا': 'ه',
  'يا': 'ي', 'ياا': 'ي',
  'حا': 'ح', 'حاا': 'ح',
  'عين': 'ع',
  'كاف': 'ك',
  'قاف': 'ق',
  'نون': 'ن',
};

// Longer spellings first, so "alif lam mim sad" is not cut short at "alif lam mim".
const SPELLED: ReadonlyArray<readonly [RegExp, string]> = [
  [/^الف\s+لام\s*ميم\s+صاد/u, 'المص'],
  [/^الف\s+لام\s*ميم\s+راا?/u, 'المر'],
  [/^طاا?\s*سين\s*ميم/u, 'طسم'],
  [/^الف\s+لام\s*ميم/u, 'الم'],
  [/^الف\s+لامين/u, 'الم'],
  [/^الف\s+لام\s*مين/u, 'الم'],
  [/^الف\s+لام\s*راا?/u, 'الر'],
  [/^الف\s+لم(?=\s|$)/u, 'الم'],
  [/^الف\s+لام\s+م(?=\s|$)/u, 'الم'],
  [/^اللام\s+ميم/u, 'الم'],
  [/^اللام\s+مي(?=\s|$)/u, 'الم'],
  [/^اللام\s+راا?/u, 'الر'],
  [/^اللاميم(?=\s|$)/u, 'الم'],
  [/^اللامي(?=\s|$)/u, 'الم'],
  [/^اللام(?=\s|$)/u, 'الم'],
  [/^طاا?\s*سين/u, 'طس'],
  [/^طاا?\s*هاا?/u, 'طه'],
  [/^ياا?\s*سين/u, 'يس'],
  [/^حاا?\s*ميم/u, 'حم'],
];

export interface Collapse {
  readonly replacement: readonly string[];
  readonly consumed: number;
}

// Rewrites the first spoken words into the letters `expected` when they spell them out or garble them.
export function collapseMuqattaat(tokens: readonly string[], expected: string, following?: WordForm): Collapse | null {
  const words = tokens.map(normalizeSpoken);
  const first = words[0];
  if (!first || first === expected) return null;

  const joined = words.join(' ');
  for (const [pattern, letters] of SPELLED) {
    const match = pattern.exec(joined);
    if (match) return cut(words, match[0].length, letters);
  }

  const maxWords = Math.min(expected.length + 2, 5, words.length);
  let rebuilt = '';
  for (let n = 1; n <= maxWords; n++) {
    const letter = LETTER_NAMES[words[n - 1]];
    if (letter === undefined) break;
    rebuilt += letter;
    if (rebuilt === expected) return { replacement: [expected], consumed: n };
  }

  if (expected.length >= 2 && first.startsWith(expected)) {
    const rest = first.slice(expected.length);
    const glued = following !== undefined && similarity(rest, following) >= CORRECT_THRESHOLD;
    // A few stray letters means a garbled reading; a longer tail, or the next word itself, was glued on.
    if (rest.length <= 3 && !glued) return { replacement: [expected], consumed: 1 };
    return { replacement: [expected, rest], consumed: 1 };
  }
  return null;
}

function cut(words: readonly string[], length: number, letters: string): Collapse {
  let offset = 0;
  for (let i = 0; i < words.length; i++) {
    const end = offset + words[i].length;
    if (length <= end) {
      const rest = words[i].slice(length - offset);
      return { replacement: rest ? [letters, rest] : [letters], consumed: i + 1 };
    }
    offset = end + 1;
  }
  return { replacement: [letters], consumed: words.length };
}
