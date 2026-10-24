// Word texts are stored exactly as the API returns them: no Unicode normalisation, no edits.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const API = 'https://api.quran.com/api/v4';
const BUNDLED_SURAHS = [1, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114];
// Opening verses that start with the disconnected letters, used by the engine tests.
const SAMPLE_VERSES = ['2:1', '2:2', '7:1', '19:1', '20:1', '26:1', '36:1', '38:1', '42:1', '42:2', '50:1', '68:1'];
const OUT = fileURLToPath(new URL('../src/data/quran.json', import.meta.url));
const SAMPLES_OUT = fileURLToPath(new URL('../src/data/samples.json', import.meta.url));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  await sleep(250);
  return res.json();
}

function pickWords(verse) {
  return verse.words
    .filter((w) => w.char_type_name === 'word')
    .map((w) => ({ position: w.position, text_uthmani: w.text_uthmani, text_imlaei: w.text_imlaei }));
}

async function fetchSurah(id) {
  const verses = [];
  for (let page = 1; page; ) {
    const data = await getJson(
      `${API}/verses/by_chapter/${id}?words=true&word_fields=text_uthmani,text_imlaei&per_page=50&page=${page}`,
    );
    for (const v of data.verses) {
      verses.push({ verse_key: v.verse_key, verse_number: v.verse_number, words: pickWords(v) });
    }
    page = data.pagination.next_page;
  }
  return { id, verses };
}

const { chapters } = await getJson(`${API}/chapters?language=en`);
const surahs = [];
for (const id of BUNDLED_SURAHS) surahs.push(await fetchSurah(id));
const samples = [];
for (const key of SAMPLE_VERSES) {
  const { verse } = await getJson(`${API}/verses/by_key/${key}?words=true&word_fields=text_uthmani,text_imlaei`);
  samples.push({ verse_key: verse.verse_key, verse_number: verse.verse_number, words: pickWords(verse) });
}

const source = {
  name: 'Quran.com API v4',
  url: API,
  fetched: new Date().toISOString().slice(0, 10),
  note: 'Word-level text_uthmani and text_imlaei copied byte-for-byte from the API responses.',
};
const fixture = {
  source,
  chapters: chapters.map((c) => ({
    id: c.id,
    name_simple: c.name_simple,
    name_arabic: c.name_arabic,
    translated_name: c.translated_name.name,
    verses_count: c.verses_count,
    bismillah_pre: c.bismillah_pre,
    revelation_place: c.revelation_place,
  })),
  surahs,
};

await writeFile(OUT, JSON.stringify(fixture, null, 1) + '\n');
await writeFile(SAMPLES_OUT, JSON.stringify({ source, verses: samples }, null, 1) + '\n');
const words = surahs.reduce((n, s) => n + s.verses.reduce((m, v) => m + v.words.length, 0), 0);
console.log(`Wrote ${OUT}: ${chapters.length} chapters, ${surahs.length} surahs, ${words} words, ${samples.length} samples`);
