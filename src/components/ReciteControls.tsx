import type { RecitationMode, RecitationPhase } from '../hooks/useRecitation';
import type { RecognitionErrorCode } from '../speech/types';
import { MicIcon, PlayIcon, StopIcon } from './icons';

export interface LiveProgress {
  readonly reached: number;
  readonly correct: number;
  readonly total: number;
}

interface ReciteControlsProps {
  readonly phase: RecitationPhase;
  readonly mode: RecitationMode | null;
  readonly ready: boolean;
  readonly micSupported: boolean;
  readonly error: RecognitionErrorCode | null;
  readonly progress: LiveProgress;
  readonly finals: readonly string[];
  readonly interim: string;
  readonly onMic: () => void;
  readonly onSample: () => void;
  readonly onStop: () => void;
}

const ERRORS: Readonly<Record<RecognitionErrorCode, string>> = {
  unsupported: 'This browser has no speech recognition. The sample recitation still works.',
  'not-allowed': 'Microphone access is blocked. Allow it from the address bar, then press the mic again.',
  'audio-capture': 'No microphone was found.',
  network: "The browser's speech service could not be reached. Check your connection and try again.",
  'language-not-supported': 'This browser cannot recognise Arabic (ar-SA).',
  failed: 'Speech recognition stopped unexpectedly. Please try again.',
};

function status(phase: RecitationPhase, mode: RecitationMode | null, micSupported: boolean): [string, string] {
  if (phase === 'listening' && mode === 'sample') return ['Playing a sample recitation', 'A scripted transcript with a few deliberate mistakes'];
  if (phase === 'listening') return ['Listening…', 'Recite at your normal pace. Words turn green as they are heard.'];
  if (phase === 'done') return ['Recitation checked', 'Your score and mistakes are below.'];
  if (!micSupported) return ['Try the sample recitation', 'This browser has no speech recognition.'];
  return ['Press the mic and recite', "Uses your browser's Arabic speech recognition."];
}

export function ReciteControls(props: ReciteControlsProps) {
  const { phase, mode, ready, micSupported, error, progress, finals, interim, onMic, onSample, onStop } = props;
  const listening = phase === 'listening';
  const [title, subtitle] = status(phase, mode, micSupported);
  const accuracy = progress.reached > 0 ? Math.round((progress.correct / progress.reached) * 100) : null;
  const heard = finals.join(' ');

  return (
    <section
      aria-label="Recitation controls"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-12px_32px_-24px_rgba(60,40,10,0.45)] backdrop-blur lg:static lg:rounded-3xl lg:border lg:p-5 lg:shadow-none"
    >
      <div className="flex items-center gap-3 lg:gap-4">
        <button
          type="button"
          onClick={listening ? onStop : onMic}
          disabled={!ready || (!listening && !micSupported)}
          aria-pressed={listening && mode === 'mic'}
          aria-label={listening ? 'Stop' : 'Start reciting'}
          className={`grid size-14 shrink-0 place-items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 lg:size-16 ${
            listening
              ? 'animate-[listening_1.4s_ease-out_infinite] bg-del text-on-accent'
              : 'bg-accent text-on-accent hover:bg-accent-strong'
          }`}
        >
          {listening ? <StopIcon className="size-6" /> : <MicIcon className="size-7" />}
        </button>
        <div className="min-w-0 flex-1" aria-live="polite">
          <p className="truncate font-semibold">{title}</p>
          <p className="line-clamp-2 text-sm text-muted">
            {listening ? `${progress.reached} of ${progress.total} words${accuracy === null ? '' : ` · ${accuracy}% correct so far`}` : subtitle}
          </p>
        </div>
      </div>

      {listening && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sunken" aria-hidden="true">
          <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${(progress.reached / Math.max(progress.total, 1)) * 100}%` }} />
        </div>
      )}

      <button
        type="button"
        onClick={onSample}
        disabled={!ready || listening}
        className={`mt-3 w-full items-center justify-center gap-2 rounded-full border border-line bg-paper px-4 py-2 text-sm font-medium transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50 ${
          listening ? 'hidden lg:flex' : 'flex'
        }`}
      >
        <PlayIcon className="size-4" />
        Try a sample recitation
        <span className="hidden text-muted sm:inline">· no mic needed</span>
      </button>

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-del/10 px-3 py-2 text-sm text-del">
          {ERRORS[error]}
        </p>
      )}
      {!micSupported && !error && (
        <p className="mt-3 hidden rounded-xl bg-sunken px-3 py-2 text-sm text-muted lg:block">
          Live recitation uses the Web Speech API. It works in Chrome and Edge on desktop and Android.
        </p>
      )}

      <div className="mt-4 hidden lg:block">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">Heard</p>
        <p dir="rtl" lang="ar" className="quran mt-1 max-h-36 min-h-14 overflow-y-auto rounded-xl bg-sunken px-3 py-2 text-xl leading-relaxed">
          {heard}
          {interim && <span className="text-muted"> {interim}</span>}
          {!heard && !interim && (
            <span className="font-sans text-sm text-faint" dir="ltr">
              The transcript appears here.
            </span>
          )}
        </p>
      </div>
    </section>
  );
}
