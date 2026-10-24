import { afterEach, describe, expect, it, vi } from 'vitest';
import { QURAN_API, fetchSurah } from './api';

const word = (position: number, type = 'word') => ({
  position,
  char_type_name: type,
  text_uthmani: `u${position}`,
  text_imlaei: `i${position}`,
});

function page(verses: number[], next: number | null) {
  return {
    verses: verses.map((n) => ({ verse_key: `9:${n}`, verse_number: n, words: [word(1), word(2), word(3, 'end')] })),
    pagination: { next_page: next },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('fetchSurah', () => {
  it('follows pagination, drops verse-number markers and caches the result', async () => {
    const fetch = vi.fn(async (url: string) => {
      const p = new URL(url).searchParams.get('page');
      return new Response(JSON.stringify(p === '1' ? page([1, 2], 2) : page([3], null)));
    });
    vi.stubGlobal('fetch', fetch);

    const surah = await fetchSurah(201);
    expect(surah.verses.map((v) => v.verse_key)).toEqual(['9:1', '9:2', '9:3']);
    expect(surah.verses[0].words).toEqual([
      { position: 1, text_uthmani: 'u1', text_imlaei: 'i1' },
      { position: 2, text_uthmani: 'u2', text_imlaei: 'i2' },
    ]);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(String(fetch.mock.calls[0][0])).toContain(`${QURAN_API}/verses/by_chapter/201?words=true`);

    await fetchSurah(201);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('reports a failed request and tries again next time', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('busy', { status: 503 })));
    await expect(fetchSurah(202)).rejects.toThrow('503');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(page([1], null)))));
    await expect(fetchSurah(202)).resolves.toMatchObject({ id: 202 });
  });

  it('rejects a response that is not a page of verses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ message: 'nope' }))));
    await expect(fetchSurah(203)).rejects.toThrow('unexpected response');
  });
});
