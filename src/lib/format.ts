const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';

export function arabicNumber(n: number): string {
  return String(n).replace(/\d/g, (d) => ARABIC_INDIC[Number(d)]);
}

export function percent(score: number | undefined): string {
  return `${Math.round((score ?? 0) * 100)}%`;
}

const dateFormat = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export function shortDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : dateFormat.format(date);
}

export function scoreTone(score: number): 'great' | 'good' | 'fair' | 'poor' {
  if (score >= 80) return 'great';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}
