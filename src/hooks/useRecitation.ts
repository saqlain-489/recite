import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { summarize, type ExpectedWord, type Summary } from '../engine';
import type { RecognitionSource } from '../speech/types';
import { createWebSpeechSource } from '../speech/webSpeech';
import { useAlignment } from './useAlignment';
import { useRecognizer } from './useRecognizer';

export type RecitationMode = 'mic' | 'sample';
export type RecitationPhase = 'idle' | 'listening' | 'done';

const AUTO_STOP_MS = 1500;

export function useRecitation(
  expected: readonly ExpectedWord[],
  onDone: (summary: Summary, mode: RecitationMode) => void,
) {
  const alignment = useAlignment(expected);
  const { pushInterim, pushFinal, finish, reset: resetAlignment } = alignment;
  const recognizer = useRecognizer({ onInterim: pushInterim, onFinal: pushFinal, onEnd: finish });
  const { listening, stop: stopRecognizer, start: startRecognizer, clearError } = recognizer;
  const [mode, setMode] = useState<RecitationMode | null>(null);

  const finished = alignment.committed.finished;
  const summary = useMemo(
    () => (finished && alignment.heardAnything ? summarize(alignment.committed, expected) : null),
    [finished, alignment.heardAnything, alignment.committed, expected],
  );

  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });
  const reported = useRef<Summary | null>(null);
  useEffect(() => {
    if (summary && mode && reported.current !== summary) {
      reported.current = summary;
      onDoneRef.current(summary, mode);
    }
  }, [summary, mode]);

  const stop = useCallback(() => {
    stopRecognizer();
    finish();
  }, [stopRecognizer, finish]);

  const lastRequired = useMemo(() => expected.findLastIndex((w) => !w.optional), [expected]);
  const reachedEnd = listening && lastRequired >= 0 && alignment.committed.lastMatched >= lastRequired;
  useEffect(() => {
    if (!reachedEnd) return;
    const timer = setTimeout(stop, AUTO_STOP_MS);
    return () => clearTimeout(timer);
  }, [reachedEnd, stop]);

  const start = useCallback(
    (next: RecitationMode, sample?: RecognitionSource) => {
      resetAlignment();
      setMode(next);
      startRecognizer(next === 'mic' || !sample ? createWebSpeechSource('ar-SA') : sample);
    },
    [resetAlignment, startRecognizer],
  );

  const reset = useCallback(() => {
    stopRecognizer();
    resetAlignment();
    clearError();
    setMode(null);
  }, [stopRecognizer, resetAlignment, clearError]);

  const phase: RecitationPhase = listening ? 'listening' : summary ? 'done' : 'idle';

  return {
    phase,
    mode,
    match: alignment.match,
    finals: alignment.finals,
    interim: alignment.interim,
    summary,
    error: recognizer.error,
    start,
    stop,
    reset,
  };
}
