import { useCallback, useEffect, useState } from 'react';
import { fetchSurah } from '../quran/api';
import { bundledSurah } from '../quran/fixture';
import type { Surah } from '../quran/types';

export type SurahLoad =
  | { readonly status: 'ready'; readonly surah: Surah; readonly source: 'bundled' | 'api' }
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string };

const LOADING: SurahLoad = { status: 'loading' };

// Bundled surahs render at once and work offline; any other surah comes from the quran.com API.
export function useSurah(id: number): { load: SurahLoad; retry: () => void } {
  const bundled = bundledSurah(id);
  const [remote, setRemote] = useState<{ id: number; load: SurahLoad } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (bundled) return;
    let live = true;
    fetchSurah(id).then(
      (surah) => live && setRemote({ id, load: { status: 'ready', surah, source: 'api' } }),
      (error: unknown) =>
        live &&
        setRemote({
          id,
          load: { status: 'error', message: error instanceof Error ? error.message : 'The surah could not be loaded.' },
        }),
    );
    return () => {
      live = false;
    };
  }, [id, bundled, attempt]);

  const retry = useCallback(() => {
    setRemote(null);
    setAttempt((n) => n + 1);
  }, []);

  const load: SurahLoad = bundled
    ? { status: 'ready', surah: bundled, source: 'bundled' }
    : remote?.id === id
      ? remote.load
      : LOADING;
  return { load, retry };
}
