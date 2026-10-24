import { useCallback, useEffect, useRef, useState } from 'react';
import type { RecognitionErrorCode, RecognitionSource } from '../speech/types';

interface Listeners {
  readonly onInterim: (text: string) => void;
  readonly onFinal: (text: string) => void;
  readonly onEnd: () => void;
}

export function useRecognizer(listeners: Listeners) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<RecognitionErrorCode | null>(null);
  const sourceRef = useRef<RecognitionSource | null>(null);
  const listenersRef = useRef(listeners);

  useEffect(() => {
    listenersRef.current = listeners;
  });

  const start = useCallback((source: RecognitionSource) => {
    sourceRef.current?.stop();
    sourceRef.current = source;
    setError(null);
    setListening(true);
    // Late events from a source that was replaced or stopped are ignored.
    const current = () => sourceRef.current === source;
    source.start({
      onInterim: (text) => current() && listenersRef.current.onInterim(text),
      onFinal: (text) => current() && listenersRef.current.onFinal(text),
      onError: (code) => current() && setError(code),
      onEnd: () => {
        if (!current()) return;
        sourceRef.current = null;
        setListening(false);
        listenersRef.current.onEnd();
      },
    });
  }, []);

  const stop = useCallback(() => {
    const source = sourceRef.current;
    sourceRef.current = null;
    source?.stop();
    setListening(false);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => () => sourceRef.current?.stop(), []);

  return { listening, error, start, stop, clearError };
}
