import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Footer, Header, Legend } from './components/Chrome';
import { HistoryPanel } from './components/HistoryPanel';
import { MushafView, wordId } from './components/MushafView';
import { ReciteControls, type LiveProgress } from './components/ReciteControls';
import { ResultPanel } from './components/ResultPanel';
import { SurahPicker } from './components/SurahPicker';
import { buildDemoScript, demoVerses } from './demo/script';
import { currentIndex, type ExpectedWord, type MatchState, type Summary } from './engine';
import { useHistory } from './hooks/useHistory';
import { useRecitation, type RecitationMode } from './hooks/useRecitation';
import { useShapesAcrossSpans } from './hooks/useShaping';
import { useSurah } from './hooks/useSurah';
import { buildExpected } from './quran/expected';
import { BISMILLAH, BUNDLED_IDS, CHAPTERS, chapterById } from './quran/fixture';
import type { VerseRange } from './quran/types';
import { createScriptedSource } from './speech/scripted';
import { getSpeechRecognition } from './speech/webSpeech';

interface Selection {
  readonly surahId: number;
  readonly range: VerseRange;
}

const fullRange = (surahId: number): VerseRange => ({ from: 1, to: chapterById(surahId).verses_count });

function initialSelection(): Selection {
  const requested = Number(new URLSearchParams(window.location.search).get('surah'));
  const surahId = Number.isInteger(requested) && requested >= 1 && requested <= 114 ? requested : 1;
  return { surahId, range: fullRange(surahId) };
}

function progressOf(match: MatchState, expected: readonly ExpectedWord[]): LiveProgress {
  let reached = 0;
  let correct = 0;
  let total = 0;
  expected.forEach((word, i) => {
    if (word.optional) return;
    total++;
    const status = match.words[i]?.status;
    if (status === 'correct' || status === 'substituted' || status === 'missed') reached++;
    if (status === 'correct') correct++;
  });
  return { reached, correct, total };
}

function flashWord(index: number) {
  const el = document.getElementById(wordId(Math.max(index, 0)));
  if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el.dataset.flash = 'true';
  setTimeout(() => delete el.dataset.flash, 1300);
}

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export function App() {
  const [selection, setSelection] = useState(initialSelection);
  const { surahId, range } = selection;
  const chapter = chapterById(surahId);
  const { load, retry } = useSurah(surahId);
  const surah = load.status === 'ready' ? load.surah : null;
  const expected = useMemo(() => (surah ? buildExpected(surah, chapter, range, BISMILLAH) : []), [surah, chapter, range]);

  const { attempts, add, clear } = useHistory();
  const joiners = !useShapesAcrossSpans();
  const micSupported = useMemo(() => getSpeechRecognition() !== null, []);

  const onDone = useCallback(
    (summary: Summary, mode: RecitationMode) =>
      add({
        id: newId(),
        date: new Date().toISOString(),
        surahId,
        surahName: chapter.name_simple,
        from: range.from,
        to: range.to,
        source: mode,
        score: summary.score,
        total: summary.total,
        correct: summary.correct,
        substituted: summary.substituted,
        missed: summary.missed,
        unreached: summary.unreached,
        extra: summary.extra,
        mistakes: summary.mistakes.map(({ kind, verseKey, expected, spoken }) => ({ kind, verseKey, expected, spoken })),
      }),
    [add, surahId, chapter, range],
  );
  const recitation = useRecitation(expected, onDone);
  const { phase, mode, match, summary, start, stop, reset } = recitation;
  const listening = phase === 'listening';

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('surah', String(surahId));
    window.history.replaceState(null, '', url);
  }, [surahId]);

  const [pendingSample, setPendingSample] = useState(false);
  const startSample = useCallback(() => {
    if (!surah) return;
    const inRange = surah.verses.filter((v) => v.verse_number >= range.from && v.verse_number <= range.to);
    const verses = demoVerses(inRange);
    if (verses.length < inRange.length) {
      setSelection({ surahId, range: { from: range.from, to: verses[verses.length - 1].verse_number } });
      setPendingSample(true);
      return;
    }
    const bismillah = chapter.bismillah_pre && range.from === 1 ? BISMILLAH : null;
    start('sample', createScriptedSource(buildDemoScript(verses, bismillah).steps));
  }, [surah, surahId, chapter, range, start]);

  useEffect(() => {
    if (!pendingSample) return;
    setPendingSample(false);
    startSample();
  }, [pendingSample, startSample]);

  const resultRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = resultRef.current;
    if (!summary || !el) return;
    if (el.getBoundingClientRect().top > window.innerHeight - 120) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [summary]);

  const best = useMemo(() => {
    const map = new Map<number, number>();
    for (const a of attempts) map.set(a.surahId, Math.max(map.get(a.surahId) ?? 0, a.score));
    return map;
  }, [attempts]);

  const changeSurah = (id: number) => {
    reset();
    setSelection({ surahId: id, range: fullRange(id) });
  };
  const changeRange = (next: VerseRange) => {
    reset();
    setSelection({ surahId, range: next });
  };

  return (
    <div className="min-h-dvh pb-44 lg:pb-0">
      <Header />
      <main className="mx-auto grid max-w-6xl gap-5 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start lg:gap-6">
        <div className="flex min-w-0 flex-col gap-4">
          <SurahPicker
            chapters={CHAPTERS}
            bundled={BUNDLED_IDS}
            chapter={chapter}
            range={range}
            best={best}
            disabled={listening}
            onSurah={changeSurah}
            onRange={changeRange}
          />
          {load.status === 'loading' && (
            <div className="rounded-3xl border border-line bg-card p-10 text-center text-sm text-muted">
              Loading {chapter.name_simple} from the quran.com API…
            </div>
          )}
          {load.status === 'error' && (
            <div role="alert" className="rounded-3xl border border-line bg-card p-8 text-center text-sm">
              <p className="text-del">{load.message}</p>
              <p className="mt-1 text-muted">Al-Fatiha and surahs 105 to 114 are bundled and work offline.</p>
              <button
                type="button"
                onClick={retry}
                className="mt-4 rounded-full border border-line px-4 py-1.5 font-medium hover:border-accent"
              >
                Try again
              </button>
            </div>
          )}
          {surah && (
            <MushafView
              chapter={chapter}
              surah={surah}
              range={range}
              bismillah={BISMILLAH}
              expected={expected}
              match={match}
              current={listening ? currentIndex(match) : -1}
              listening={listening}
              joiners={joiners}
            />
          )}
          <Legend />
        </div>

        <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:pb-2">
          <ReciteControls
            phase={phase}
            mode={mode}
            ready={surah !== null && expected.length > 0}
            micSupported={micSupported}
            error={recitation.error}
            progress={progressOf(match, expected)}
            finals={recitation.finals}
            interim={recitation.interim}
            onMic={() => start('mic')}
            onSample={startSample}
            onStop={stop}
          />
          {summary && mode && (
            <ResultPanel
              ref={resultRef}
              summary={summary}
              mode={mode}
              expected={expected}
              joiners={joiners}
              onSelect={flashWord}
              onAgain={() => (mode === 'sample' ? startSample() : start('mic'))}
            />
          )}
          <HistoryPanel attempts={attempts} onClear={clear} />
        </aside>
      </main>
      <Footer />
    </div>
  );
}
