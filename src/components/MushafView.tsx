import { Fragment, useEffect, useMemo } from 'react';
import { analyzeWord, type ExpectedWord, type ExtraWord, type MatchState, type WordMatch } from '../engine';
import { arabicNumber, percent } from '../lib/format';
import type { Chapter, QuranWord, Surah, VerseRange } from '../quran/types';
import { Word, type WordView } from './Word';

interface MushafViewProps {
  readonly chapter: Chapter;
  readonly surah: Surah;
  readonly range: VerseRange;
  readonly bismillah: readonly QuranWord[];
  readonly expected: readonly ExpectedWord[];
  readonly match: MatchState;
  readonly current: number;
  readonly listening: boolean;
  readonly joiners: boolean;
}

export const wordId = (index: number) => `word-${index}`;

function describe(match: WordMatch): string | undefined {
  switch (match.status) {
    case 'correct':
      return match.score !== undefined && match.score < 1 ? `Correct, heard “${match.spoken}”` : 'Correct';
    case 'substituted':
      return `Heard “${match.spoken}” (${percent(match.score)} match)`;
    case 'missed':
      return 'Missed: this word was not heard';
    case 'unreached':
      return 'Not recited';
    case 'pending':
      return undefined;
  }
}

function ExtraChips({ extras, tentative }: { readonly extras: readonly Pick<ExtraWord, 'spoken' | 'repeat'>[]; readonly tentative?: boolean }) {
  return extras.map((extra, i) => (
    <span
      key={i}
      className="extra-chip"
      data-tentative={tentative ? 'true' : undefined}
      title={extra.repeat ? `Repeated “${extra.spoken}”` : `Extra word: “${extra.spoken}”`}
    >
      + {extra.spoken}
    </span>
  ));
}

export function MushafView({ chapter, surah, range, bismillah, expected, match, current, listening, joiners }: MushafViewProps) {
  const byKey = useMemo(() => new Map(expected.map((w) => [`${w.verseKey}:${w.position}`, w])), [expected]);
  const plainForms = useMemo(
    () => new Map(surah.verses.flatMap((v) => v.words.map((w) => [`${v.verse_key}:${w.position}`, analyzeWord(w.text_uthmani)]))),
    [surah],
  );
  const bismillahForms = useMemo(() => bismillah.map((w) => analyzeWord(w.text_uthmani)), [bismillah]);

  const extrasAfter = useMemo(() => {
    const map = new Map<number, ExtraWord[]>();
    for (const extra of match.extras) map.set(extra.afterIndex, [...(map.get(extra.afterIndex) ?? []), extra]);
    return map;
  }, [match.extras]);

  useEffect(() => {
    if (!listening || current < 0) return;
    const el = document.getElementById(wordId(current));
    if (!el) return;
    const box = el.getBoundingClientRect();
    if (box.top < 80 || box.bottom > window.innerHeight - 160) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [current, listening]);

  const renderWord = (key: string, fallback: ReturnType<typeof analyzeWord>) => {
    const word = byKey.get(key);
    if (!word) return <Word form={fallback} status="outside" joiners={joiners} />;
    const m = match.words[word.index];
    const status: WordView = m?.status ?? 'pending';
    return (
      <>
        <Word
          id={wordId(word.index)}
          form={word.form}
          status={status}
          heard={m?.heard}
          current={word.index === current && !match.finished}
          joiners={joiners}
          title={m ? describe(m) : undefined}
        />
        <ExtraChips extras={extrasAfter.get(word.index) ?? []} />
        {word.index === match.lastMatched && !match.finished && <ExtraChips extras={match.unplaced.map((u) => ({ ...u, repeat: false }))} tentative />}
      </>
    );
  };

  return (
    <article className="rounded-3xl border border-line bg-card px-4 pt-6 pb-8 shadow-[0_1px_0_rgba(0,0,0,0.03),0_12px_32px_-24px_rgba(60,40,10,0.35)] sm:px-8">
      <header className="mb-5 flex flex-col items-center text-center">
        <p className="text-[0.7rem] font-semibold tracking-[0.18em] text-muted uppercase">Surah {chapter.id}</p>
        <div className="mt-2 flex w-full max-w-sm items-center gap-3">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-accent/40" />
          <p dir="rtl" lang="ar" className="quran text-[2rem] leading-[1.7] text-accent-strong">
            {chapter.name_arabic}
          </p>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-accent/40" />
        </div>
        <p className="text-sm text-muted">
          {chapter.name_simple} · {chapter.translated_name} · {chapter.verses_count} verses
        </p>
      </header>

      {chapter.bismillah_pre && (
        <p dir="rtl" lang="ar" className="quran mb-3 text-center text-[1.6rem] leading-[2.3] sm:text-[1.8rem]">
          {bismillah.map((w, i) => (
            <Fragment key={w.position}>
              {renderWord(`${chapter.id}:0:${w.position}`, bismillahForms[i])}{' '}
            </Fragment>
          ))}
        </p>
      )}

      <div dir="rtl" lang="ar" className="quran text-justify text-[1.75rem] leading-[2.45] [text-align-last:start] sm:text-[2.1rem]">
        {surah.verses.map((verse) => {
          const outside = verse.verse_number < range.from || verse.verse_number > range.to;
          return (
            <Fragment key={verse.verse_key}>
              {verse.words.map((w) => (
                <Fragment key={w.position}>
                  {renderWord(`${verse.verse_key}:${w.position}`, plainForms.get(`${verse.verse_key}:${w.position}`)!)}{' '}
                </Fragment>
              ))}
              <span className="ayah-end" data-outside={outside ? 'true' : undefined} aria-label={`Verse ${verse.verse_number}`}>
                {arabicNumber(verse.verse_number)}
              </span>{' '}
            </Fragment>
          );
        })}
      </div>
    </article>
  );
}
