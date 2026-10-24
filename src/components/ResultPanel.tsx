import type { Ref } from 'react';
import type { ExpectedWord, Summary } from '../engine';
import type { RecitationMode } from '../hooks/useRecitation';
import { plural } from '../lib/format';
import { RetryIcon } from './icons';
import { MistakeList } from './MistakeList';
import { ScoreRing } from './ScoreRing';

interface ResultPanelProps {
  readonly summary: Summary;
  readonly mode: RecitationMode;
  readonly expected: readonly ExpectedWord[];
  readonly joiners: boolean;
  readonly onSelect: (index: number) => void;
  readonly onAgain: () => void;
  readonly ref?: Ref<HTMLElement>;
}

function Count({ label, value, tone }: { readonly label: string; readonly value: number; readonly tone: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`size-2.5 rounded-full ${tone}`} aria-hidden="true" />
      <span className="text-muted">{label}</span>
      <span className="ms-auto font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function headline(summary: Summary): string {
  if (summary.score === 100) return 'Every word was heard correctly.';
  const parts = [`${summary.correct} of ${summary.total} words correct`];
  if (summary.unreached > 0 && summary.unreachedFrom) parts.push(`stopped at ${summary.unreachedFrom}`);
  return `${parts.join(', ')}.`;
}

export function ResultPanel({ summary, mode, expected, joiners, onSelect, onAgain, ref }: ResultPanelProps) {
  const listed = summary.mistakes.length;
  return (
    <section ref={ref} aria-label="Result" className="scroll-mt-4 rounded-3xl border border-line bg-card p-5">
      <div className="flex items-center gap-5">
        <ScoreRing score={summary.score} />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Count label="Correct" value={summary.correct} tone="bg-ok" />
          <Count label="Substituted" value={summary.substituted} tone="bg-sub" />
          <Count label="Missed" value={summary.missed} tone="bg-del" />
          <Count label="Extra" value={summary.extra} tone="bg-extra" />
          {summary.unreached > 0 && <Count label="Not reached" value={summary.unreached} tone="bg-faint" />}
        </div>
      </div>
      <p className="mt-4 text-sm">
        {headline(summary)}
        {mode === 'sample' && <span className="text-muted"> This was the scripted sample.</span>}
      </p>

      {listed > 0 && (
        <>
          <h2 className="mt-5 mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
            Expected vs heard · {plural(listed, 'item')}
          </h2>
          <MistakeList mistakes={summary.mistakes} expected={expected} joiners={joiners} onSelect={onSelect} />
        </>
      )}

      <button
        type="button"
        onClick={onAgain}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent transition hover:bg-accent-strong"
      >
        <RetryIcon className="size-4" />
        {mode === 'sample' ? 'Play the sample again' : 'Recite again'}
      </button>
    </section>
  );
}
