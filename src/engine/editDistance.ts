import type { Unit } from './normalize';

export function levenshtein(a: string, b: string): number {
  const s = [...a];
  const t = [...b];
  let prev = Array.from({ length: t.length + 1 }, (_, j) => j);
  for (let i = 1; i <= s.length; i++) {
    const row = [i];
    for (let j = 1; j <= t.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (s[i - 1] === t[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[t.length];
}

const subCost = (unit: Unit, ch: string) => (unit.alts.includes(ch) ? 0 : 1);
const dropCost = (unit: Unit) => (unit.optional ? 0 : 1);

// Levenshtein where an optional unit can be skipped for free and a unit may accept several letters.
export function unitDistance(units: readonly Unit[], spoken: string): number {
  const t = [...spoken];
  let prev = Array.from({ length: t.length + 1 }, (_, j) => j);
  for (const unit of units) {
    const row = [prev[0] + dropCost(unit)];
    for (let j = 1; j <= t.length; j++) {
      row[j] = Math.min(prev[j] + dropCost(unit), row[j - 1] + 1, prev[j - 1] + subCost(unit, t[j - 1]));
    }
    prev = row;
  }
  return prev[t.length];
}

export type UnitOp = 'ok' | 'sub' | 'del' | 'skip';

export interface UnitAlignment {
  readonly distance: number;
  readonly ops: readonly UnitOp[];
  readonly inserted: number;
}

export function alignUnits(units: readonly Unit[], spoken: string): UnitAlignment {
  const t = [...spoken];
  const n = units.length;
  const m = t.length;
  const d = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let j = 0; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) {
    const unit = units[i - 1];
    d[i][0] = d[i - 1][0] + dropCost(unit);
    for (let j = 1; j <= m; j++) {
      d[i][j] = Math.min(d[i - 1][j] + dropCost(unit), d[i][j - 1] + 1, d[i - 1][j - 1] + subCost(unit, t[j - 1]));
    }
  }

  const ops = new Array<UnitOp>(n);
  let inserted = 0;
  let i = n;
  let j = m;
  // On ties prefer a match, then skipping an optional letter, so an extra spoken letter never paints a dagger alef.
  while (i > 0 || j > 0) {
    const unit = i > 0 ? units[i - 1] : undefined;
    const diagonal = unit && j > 0 ? d[i - 1][j - 1] + subCost(unit, t[j - 1]) : Number.NaN;
    if (unit && diagonal === d[i][j] && subCost(unit, t[j - 1]) === 0) {
      ops[i - 1] = 'ok';
      i--;
      j--;
    } else if (unit?.optional && d[i][j] === d[i - 1][j]) {
      ops[i - 1] = 'skip';
      i--;
    } else if (unit && diagonal === d[i][j]) {
      ops[i - 1] = 'sub';
      i--;
      j--;
    } else if (unit && d[i][j] === d[i - 1][j] + 1) {
      ops[i - 1] = 'del';
      i--;
    } else {
      inserted++;
      j--;
    }
  }
  return { distance: d[n][m], ops, inserted };
}
