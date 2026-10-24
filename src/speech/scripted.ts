import type { RecognitionSource } from './types';

export interface ScriptStep {
  readonly at: number;
  readonly kind: 'interim' | 'final';
  readonly text: string;
}

export function createScriptedSource(steps: readonly ScriptStep[], speed = 1): RecognitionSource {
  let timers: ReturnType<typeof setTimeout>[] = [];
  return {
    start(handlers) {
      for (const step of steps) {
        const send = () => (step.kind === 'final' ? handlers.onFinal(step.text) : handlers.onInterim(step.text));
        timers.push(setTimeout(send, step.at / speed));
      }
      const end = (steps.at(-1)?.at ?? 0) / speed + 300;
      timers.push(setTimeout(() => handlers.onEnd(), end));
    },
    stop() {
      timers.forEach(clearTimeout);
      timers = [];
    },
  };
}
