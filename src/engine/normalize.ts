import { DAGGER_ALEF, HAMZA, TATWEEL, WAW, attachesToPrevious, isArabicLetter } from './arabic';

const LETTER_MAP: Readonly<Record<string, string>> = {
  '\u{0622}': '\u{0627}', // alef with madda
  '\u{0623}': '\u{0627}', // alef with hamza above
  '\u{0625}': '\u{0627}', // alef with hamza below
  '\u{0671}': '\u{0627}', // alef wasla
  '\u{0672}': '\u{0627}',
  '\u{0673}': '\u{0627}',
  '\u{0675}': '\u{0627}',
  '\u{0621}': '\u{0627}', // standalone hamza
  '\u{0624}': '\u{0648}', // waw with hamza
  '\u{0626}': '\u{064A}', // yeh with hamza
  '\u{0649}': '\u{064A}', // alef maksura
  '\u{06CC}': '\u{064A}', // Persian yeh
  '\u{06A9}': '\u{0643}', // keheh
  '\u{0629}': '\u{0647}', // ta marbuta
  '\u{06C0}': '\u{0647}',
};

// Uthmani small letters: standard spelling sometimes writes them out and sometimes drops them.
const SMALL_LETTERS: Readonly<Record<string, string>> = {
  '\u{0670}': '\u{0627}', // dagger alef
  '\u{06E5}': '\u{0648}', // small waw
  '\u{06E6}': '\u{064A}', // small yeh
  '\u{06E7}': '\u{064A}', // small high yeh
  '\u{06E8}': '\u{0646}', // small high noon
  '\u{0654}': '\u{0627}', // hamza above, e.g. on a tatweel seat
  '\u{0655}': '\u{0627}', // hamza below
};

export interface Unit {
  // Every letter accepted in this place.
  readonly alts: string;
  readonly optional: boolean;
  readonly group: number;
}

export interface WordForm {
  readonly text: string;
  readonly groups: readonly string[];
  readonly units: readonly Unit[];
  // Required letters only; optional small letters are left out.
  readonly key: string;
  readonly full: string;
}

// Recognisers write standard spelling, so the spoken side keeps only full letters.
export function normalizeSpoken(text: string): string {
  let out = '';
  for (const ch of text.normalize('NFC')) {
    const mapped = LETTER_MAP[ch];
    if (mapped) out += mapped;
    else if (isArabicLetter(ch)) out += ch;
  }
  return out;
}

const SEPARATORS = /[\s\u{060C}\u{061B}\u{061F}\u{06D4}.,!?;:]+/u;
const NOT_ARABIC = /[^\p{Script=Arabic}]/gu;

export function tokenize(transcript: string): string[] {
  return transcript
    .split(SEPARATORS)
    .map((token) => token.replace(NOT_ARABIC, ''))
    .filter((token) => normalizeSpoken(token).length > 0);
}

export function stripMarks(text: string): string {
  return text.replace(/[\p{M}\u{0640}]/gu, '');
}

export function splitGroups(text: string): string[] {
  const groups: string[] = [];
  for (const ch of text) {
    const last = groups.length - 1;
    if (last >= 0 && attachesToPrevious(ch)) groups[last] += ch;
    else groups.push(ch);
  }
  return groups;
}

export function analyzeWord(text: string): WordForm {
  const groups = splitGroups(text);
  const units: Unit[] = [];
  groups.forEach((group, g) => {
    for (const ch of group) {
      if (isArabicLetter(ch)) {
        if (ch === HAMZA) units.push({ alts: '\u{0627}', optional: true, group: g });
        // A waw carrying a dagger alef is read as a long a: salah is spelled with a waw in the mushaf.
        else if (ch === WAW && group.includes(DAGGER_ALEF)) units.push({ alts: '\u{0648}\u{0627}', optional: false, group: g });
        else units.push({ alts: LETTER_MAP[ch] ?? ch, optional: false, group: g });
      } else if (ch !== TATWEEL) {
        const small = SMALL_LETTERS[ch];
        if (small) units.push({ alts: small, optional: true, group: g });
      }
    }
  });
  const first = (u: Unit) => u.alts.charAt(0);
  return {
    text,
    groups,
    units,
    key: units.filter((u) => !u.optional).map(first).join(''),
    full: units.map(first).join(''),
  };
}
