import type { Surah, Verse } from './types';

export const QURAN_API = 'https://api.quran.com/api/v4';

interface ApiWord {
  readonly position: number;
  readonly char_type_name: string;
  readonly text_uthmani: string;
  readonly text_imlaei: string;
}

interface ApiPage {
  readonly verses: ReadonlyArray<{ readonly verse_key: string; readonly verse_number: number; readonly words: readonly ApiWord[] }>;
  readonly pagination: { readonly next_page: number | null };
}

const cache = new Map<number, Promise<Surah>>();

function isPage(data: unknown): data is ApiPage {
  return typeof data === 'object' && data !== null && Array.isArray((data as { verses?: unknown }).verses);
}

async function fetchPages(id: number): Promise<Surah> {
  const verses: Verse[] = [];
  for (let page: number | null = 1; page !== null; ) {
    const url = `${QURAN_API}/verses/by_chapter/${id}?words=true&word_fields=text_uthmani,text_imlaei&per_page=50&page=${page}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`The quran.com API answered ${res.status}.`);
    const data: unknown = await res.json();
    if (!isPage(data)) throw new Error('The quran.com API sent an unexpected response.');
    for (const v of data.verses) {
      verses.push({
        verse_key: v.verse_key,
        verse_number: v.verse_number,
        // Verse-number markers come back as words of type "end".
        words: v.words
          .filter((w) => w.char_type_name === 'word')
          .map((w) => ({ position: w.position, text_uthmani: w.text_uthmani, text_imlaei: w.text_imlaei })),
      });
    }
    page = data.pagination?.next_page ?? null;
  }
  return { id, verses };
}

export function fetchSurah(id: number): Promise<Surah> {
  let pending = cache.get(id);
  if (!pending) {
    pending = fetchPages(id);
    cache.set(id, pending);
    pending.catch(() => cache.delete(id));
  }
  return pending;
}
