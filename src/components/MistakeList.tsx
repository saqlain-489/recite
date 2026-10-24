import type { ExpectedWord, Mistake, MistakeKind } from '../engine';
import { percent } from '../lib/format';
import { Word } from './Word';

const LABEL: Readonly<Record<MistakeKind, string>> = {
  substituted: 'Substituted',
  missed: 'Missed',
  extra: 'Extra',
  slip: 'Letter',
};

const BADGE: Readonly<Record<MistakeKind, string>> = {
  substituted: 'bg-sub/12 text-sub',
  missed: 'bg-del/10 text-del',
  extra: 'bg-extra/10 text-extra',
  slip: 'bg-sub/12 text-sub',
};

interface MistakeListProps {
  readonly mistakes: readonly Mistake[];
  readonly expected: readonly ExpectedWord[];
  readonly joiners: boolean;
  readonly onSelect: (index: number) => void;
}

function Detail({ mistake }: { readonly mistake: Mistake }) {
  const heard = mistake.spoken ? (
    <>
      heard{' '}
      <bdi dir="rtl" lang="ar" className="quran text-base text-ink">
        {mistake.spoken}
      </bdi>
    </>
  ) : null;
  switch (mistake.kind) {
    case 'missed':
      return <>not heard</>;
    case 'extra':
      return <>{mistake.repeat ? 'said twice' : 'not in the text'}</>;
    case 'slip':
      return <>{heard} · check the highlighted letter</>;
    case 'substituted':
      return (
        <>
          {heard} · {percent(mistake.score)} match
        </>
      );
  }
}

export function MistakeList({ mistakes, expected, joiners, onSelect }: MistakeListProps) {
  return (
    <ol className="flex flex-col gap-2">
      {mistakes.map((mistake, i) => {
        const word = mistake.kind === 'extra' ? undefined : expected[mistake.index];
        return (
          <li key={i}>
            <button
              type="button"
              onClick={() => onSelect(mistake.index)}
              className="flex w-full items-center gap-3 rounded-2xl border border-line bg-paper px-3 py-2 text-start transition hover:border-accent/60"
            >
              <span className={`w-[5.5rem] shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-semibold ${BADGE[mistake.kind]}`}>
                {LABEL[mistake.kind]}
              </span>
              <span className="min-w-0 flex-1">
                <span dir="rtl" lang="ar" className="quran inline-block pb-1 text-2xl leading-[1.9]">
                  {word ? (
                    <Word
                      form={word.form}
                      status={mistake.kind === 'missed' ? 'missed' : mistake.kind === 'slip' ? 'correct' : 'substituted'}
                      heard={mistake.heard}
                      joiners={joiners}
                    />
                  ) : (
                    <span className="text-extra">+ {mistake.spoken}</span>
                  )}
                </span>
                <span className="block text-xs text-muted">
                  {mistake.verseKey} · <Detail mistake={mistake} />
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
