import { newWords, readResults, type ResultListLike } from './results';
import type { RecognitionErrorCode, RecognitionSource } from './types';

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { readonly results: ResultListLike }) => void) | null;
  onerror: ((event: { readonly error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const FATAL: Readonly<Record<string, RecognitionErrorCode>> = {
  'not-allowed': 'not-allowed',
  'service-not-allowed': 'not-allowed',
  'audio-capture': 'audio-capture',
  network: 'network',
  'language-not-supported': 'language-not-supported',
};

export function createWebSpeechSource(lang = 'ar-SA'): RecognitionSource {
  let recognition: SpeechRecognitionLike | null = null;
  let active = false;

  return {
    start(handlers) {
      const Recognition = getSpeechRecognition();
      if (!Recognition) {
        handlers.onError('unsupported');
        handlers.onEnd();
        return;
      }
      const r = new Recognition();
      r.lang = lang;
      r.continuous = true;
      r.interimResults = true;
      r.maxAlternatives = 1;

      let sent = 0;
      let lastFinal = '';
      r.onresult = (event) => {
        const { finals, interim, next } = readResults(event.results, sent);
        sent = next;
        for (const text of finals) {
          const fresh = newWords(lastFinal, text);
          lastFinal = text;
          if (fresh) handlers.onFinal(fresh);
        }
        handlers.onInterim(interim);
      };
      r.onerror = (event) => {
        const code = FATAL[event.error];
        if (code) {
          active = false;
          handlers.onError(code);
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
          active = false;
          handlers.onError('failed');
        }
      };
      // Chrome ends a session after a pause even in continuous mode; keep listening until asked to stop.
      r.onend = () => {
        if (active) {
          sent = 0;
          lastFinal = '';
          try {
            r.start();
            return;
          } catch {
            active = false;
          }
        }
        handlers.onEnd();
      };

      recognition = r;
      active = true;
      try {
        r.start();
      } catch {
        active = false;
        handlers.onError('failed');
        handlers.onEnd();
      }
    },
    stop() {
      active = false;
      recognition?.stop();
    },
  };
}
