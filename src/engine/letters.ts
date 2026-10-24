import { ZWJ, joinsAcross } from './arabic';
import { alignUnits, type UnitOp } from './editDistance';
import type { WordForm } from './normalize';

export type LetterStatus = 'ok' | 'sub' | 'del';

export interface LetterGroup {
  readonly text: string;
  readonly status: LetterStatus;
}

const RANK: Readonly<Record<LetterStatus, number>> = { ok: 0, sub: 1, del: 2 };
const FROM_OP: Readonly<Record<UnitOp, LetterStatus>> = { ok: 'ok', skip: 'ok', sub: 'sub', del: 'del' };

export function worstStatus(statuses: readonly LetterStatus[]): LetterStatus {
  return statuses.reduce<LetterStatus>((worst, s) => (RANK[s] > RANK[worst] ? s : worst), 'ok');
}

// `heard` is the normalised spoken word, or null when the word was not recited at all.
export function letterGroups(form: WordForm, heard: string | null): LetterGroup[] {
  if (heard === null) return form.groups.map((text) => ({ text, status: 'del' }));
  const { ops } = alignUnits(form.units, heard);
  const perGroup: LetterStatus[][] = form.groups.map(() => []);
  form.units.forEach((unit, i) => perGroup[unit.group].push(FROM_OP[ops[i]]));
  return form.groups.map((text, g) => ({ text, status: worstStatus(perGroup[g]) }));
}

export function hasLetterSlip(form: WordForm, heard: string): boolean {
  return letterGroups(form, heard).some((g) => g.status !== 'ok');
}

export interface LetterRun {
  readonly text: string;
  readonly status: LetterStatus;
}

// Neighbouring groups with one status share a span; a joiner on both sides of a split keeps the letters connected.
export function letterRuns(groups: readonly LetterGroup[], joiners = true): LetterRun[] {
  const runs: { text: string; status: LetterStatus }[] = [];
  for (const group of groups) {
    const last = runs[runs.length - 1];
    if (last && last.status === group.status) last.text += group.text;
    else runs.push({ text: group.text, status: group.status });
  }
  if (joiners) {
    for (let i = 0; i < runs.length - 1; i++) {
      if (joinsAcross(runs[i].text, runs[i + 1].text)) {
        runs[i].text += ZWJ;
        runs[i + 1].text = ZWJ + runs[i + 1].text;
      }
    }
  }
  return runs;
}
