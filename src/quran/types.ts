export interface Chapter {
  readonly id: number;
  readonly name_simple: string;
  readonly name_arabic: string;
  readonly translated_name: string;
  readonly verses_count: number;
  readonly bismillah_pre: boolean;
  readonly revelation_place: string;
}

export interface QuranWord {
  readonly position: number;
  readonly text_uthmani: string;
  readonly text_imlaei: string;
}

export interface Verse {
  readonly verse_key: string;
  readonly verse_number: number;
  readonly words: readonly QuranWord[];
}

export interface Surah {
  readonly id: number;
  readonly verses: readonly Verse[];
}

export interface TextSource {
  readonly name: string;
  readonly url: string;
  readonly fetched: string;
  readonly note: string;
}

export interface VerseRange {
  readonly from: number;
  readonly to: number;
}
