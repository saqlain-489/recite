import { memo, useMemo } from 'react';
import { letterGroups, letterRuns, type WordForm, type WordStatus } from '../engine';

export type WordView = WordStatus | 'outside';

interface WordProps {
  readonly form: WordForm;
  readonly status: WordView;
  readonly heard?: string;
  readonly current?: boolean;
  readonly joiners: boolean;
  readonly id?: string;
  readonly title?: string;
}

// Letter colours are worth drawing only where the recogniser heard something different from the text.
export const Word = memo(function Word({ form, status, heard, current, joiners, id, title }: WordProps) {
  const runs = useMemo(() => {
    if (heard === undefined || (status !== 'correct' && status !== 'substituted')) return null;
    const groups = letterGroups(form, heard);
    if (status === 'correct' && groups.every((g) => g.status === 'ok')) return null;
    return letterRuns(groups, joiners);
  }, [form, heard, status, joiners]);

  return (
    <span id={id} className="word" data-status={status} data-current={current ? 'true' : undefined} title={title}>
      {runs
        ? runs.map((run, i) => (
            <span key={i} className={`letter-${run.status}`}>
              {run.text}
            </span>
          ))
        : form.text}
    </span>
  );
});
