import { TEXT_SOURCE } from '../quran/fixture';
import { Logo } from './icons';

export function Header() {
  return (
    <header className="mx-auto flex max-w-6xl items-center gap-3 px-4 pt-6 pb-5 sm:px-6">
      <Logo className="size-10 shrink-0" />
      <div className="min-w-0">
        <h1 className="text-lg leading-tight font-semibold tracking-tight">Recite</h1>
        <p className="text-sm text-muted">Recite a surah and see every word checked as you go.</p>
      </div>
    </header>
  );
}

const LEGEND = [
  ['Correct', 'bg-ok'],
  ['Substituted', 'bg-sub'],
  ['Missed', 'bg-del'],
  ['Extra', 'bg-extra'],
  ['Not reached', 'bg-faint'],
] as const;

export function Legend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-muted" aria-label="Colour key">
      {LEGEND.map(([label, tone]) => (
        <li key={label} className="flex items-center gap-1.5">
          <span className={`size-2.5 rounded-full ${tone}`} aria-hidden="true" />
          {label}
        </li>
      ))}
      <li>Coloured letters show where a word was heard differently.</li>
    </ul>
  );
}

export function Footer() {
  return (
    <footer className="mx-auto mt-10 max-w-6xl px-4 pb-8 text-xs leading-relaxed text-muted sm:px-6">
      <p>
        Quran text: word-level Uthmani script from the{' '}
        <a className="underline hover:text-ink" href="https://api.quran.com/api/v4/chapters">
          {TEXT_SOURCE.name}
        </a>{' '}
        (Quran Foundation), stored unmodified. Uthmani script is set in Amiri Quran by the Amiri Project Authors, SIL Open Font
        License 1.1. Interface text in Inter, SIL Open Font License 1.1.
      </p>
      <p className="mt-1">
        Speech recognition is done by your browser. In Chrome, audio goes to Google's speech service; this site has no server
        and stores attempts only in your browser. Code by Saqlain Ahmad, MIT licence.
      </p>
    </footer>
  );
}
