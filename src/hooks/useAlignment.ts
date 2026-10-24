import { useCallback, useMemo, useReducer } from 'react';
import { createState, finalize, ingest, tokenize, type ExpectedWord, type MatchState } from '../engine';

interface AlignmentState {
  readonly expected: readonly ExpectedWord[];
  // Built only from final results; interim results are matched on top of it into `preview` and thrown away.
  readonly committed: MatchState;
  readonly preview: MatchState;
  readonly finals: readonly string[];
  readonly interim: string;
}

type Action =
  | { readonly type: 'reset'; readonly expected: readonly ExpectedWord[] }
  | { readonly type: 'interim'; readonly text: string }
  | { readonly type: 'final'; readonly text: string }
  | { readonly type: 'finish' };

function fresh(expected: readonly ExpectedWord[]): AlignmentState {
  const state = createState(expected);
  return { expected, committed: state, preview: state, finals: [], interim: '' };
}

function reducer(state: AlignmentState, action: Action): AlignmentState {
  switch (action.type) {
    case 'reset':
      return fresh(action.expected);
    case 'interim':
      if (state.committed.finished) return state;
      return { ...state, interim: action.text, preview: ingest(state.committed, state.expected, tokenize(action.text)) };
    case 'final': {
      if (state.committed.finished) return state;
      const committed = ingest(state.committed, state.expected, tokenize(action.text));
      return { ...state, committed, preview: committed, finals: [...state.finals, action.text], interim: '' };
    }
    case 'finish': {
      if (state.committed.finished) return state;
      // Words still in the interim result when the user stops have been said; count them.
      const withInterim = ingest(state.committed, state.expected, tokenize(state.interim));
      const committed = finalize(withInterim, state.expected);
      const finals = state.interim ? [...state.finals, state.interim] : state.finals;
      return { ...state, committed, preview: committed, finals, interim: '' };
    }
  }
}

export function useAlignment(expected: readonly ExpectedWord[]) {
  const [stored, dispatch] = useReducer(reducer, expected, fresh);
  // A new passage restarts matching; React re-renders straight away with the reset state.
  if (stored.expected !== expected) dispatch({ type: 'reset', expected });
  const state = stored.expected === expected ? stored : fresh(expected);

  const reset = useCallback(() => dispatch({ type: 'reset', expected }), [expected]);
  const pushInterim = useCallback((text: string) => dispatch({ type: 'interim', text }), []);
  const pushFinal = useCallback((text: string) => dispatch({ type: 'final', text }), []);
  const finish = useCallback(() => dispatch({ type: 'finish' }), []);

  return useMemo(
    () => ({
      match: state.preview,
      committed: state.committed,
      finals: state.finals,
      interim: state.interim,
      heardAnything: state.finals.length > 0 || state.interim !== '',
      reset,
      pushInterim,
      pushFinal,
      finish,
    }),
    [state, reset, pushInterim, pushFinal, finish],
  );
}
