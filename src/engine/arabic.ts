export const ALEF = '\u{0627}';
export const HAMZA = '\u{0621}';
export const WAW = '\u{0648}';
export const TATWEEL = '\u{0640}';
export const DAGGER_ALEF = '\u{0670}';
export const SMALL_WAW = '\u{06E5}';
export const SMALL_YEH = '\u{06E6}';
export const ZWJ = '\u{200D}';
const ZWNJ = '\u{200C}';

const MARK = /\p{M}/u;

export function isMark(ch: string): boolean {
  return MARK.test(ch);
}

export function isArabicLetter(ch: string): boolean {
  const c = ch.codePointAt(0) ?? 0;
  if (c === 0x0640) return false;
  return (
    (c >= 0x0620 && c <= 0x064a) ||
    (c >= 0x066e && c <= 0x066f) ||
    (c >= 0x0671 && c <= 0x06d3) ||
    c === 0x06d5 ||
    (c >= 0x06fa && c <= 0x06fc) ||
    c === 0x06ff
  );
}

export function attachesToPrevious(ch: string): boolean {
  return isMark(ch) || ch === TATWEEL || ch === SMALL_WAW || ch === SMALL_YEH || ch === ZWJ || ch === ZWNJ;
}

type Joining = 'D' | 'R' | 'C' | 'T' | 'U';

const RIGHT_JOINING = new Set([
  0x0622, 0x0623, 0x0624, 0x0625, 0x0627, 0x0629, 0x062f, 0x0630, 0x0631, 0x0632, 0x0648, 0x0671, 0x0672, 0x0673,
  0x0675, 0x0676, 0x0677, 0x06c0, 0x06d2, 0x06d3, 0x06d5,
]);

export function joiningType(ch: string): Joining {
  const c = ch.codePointAt(0) ?? 0;
  if (c === 0x0640 || c === 0x200d) return 'C';
  if (isMark(ch)) return 'T';
  if (RIGHT_JOINING.has(c) || (c >= 0x0688 && c <= 0x0699) || (c >= 0x06c3 && c <= 0x06cb)) return 'R';
  if (c === 0x0621 || !isArabicLetter(ch)) return 'U';
  return 'D';
}

export function joinsAcross(left: string, right: string): boolean {
  const before = [...left].reverse().find((ch) => joiningType(ch) !== 'T');
  const after = [...right].find((ch) => joiningType(ch) !== 'T');
  if (!before || !after) return false;
  const l = joiningType(before);
  const r = joiningType(after);
  return (l === 'D' || l === 'C') && (r === 'D' || r === 'R' || r === 'C');
}
