import type { Chapter, VerseRange } from '../quran/types';

interface SurahPickerProps {
  readonly chapters: readonly Chapter[];
  readonly bundled: ReadonlySet<number>;
  readonly chapter: Chapter;
  readonly range: VerseRange;
  readonly best: ReadonlyMap<number, number>;
  readonly disabled: boolean;
  readonly onSurah: (id: number) => void;
  readonly onRange: (range: VerseRange) => void;
}

const field =
  'h-10 rounded-xl border border-line bg-card px-3 text-sm text-ink shadow-sm transition focus:border-accent disabled:opacity-60';

export function SurahPicker({ chapters, bundled, chapter, range, best, disabled, onSurah, onRange }: SurahPickerProps) {
  const verses = Array.from({ length: chapter.verses_count }, (_, i) => i + 1);
  const label = (c: Chapter) => {
    const score = best.get(c.id);
    return `${c.id}. ${c.name_simple} (${c.translated_name})${score === undefined ? '' : ` · best ${score}%`}`;
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex min-w-0 flex-1 basis-64 flex-col gap-1 text-xs font-medium text-muted">
        Surah
        <select className={`${field} min-w-0`} value={chapter.id} disabled={disabled} onChange={(e) => onSurah(Number(e.target.value))}>
          <optgroup label="Bundled, works offline">
            {chapters.filter((c) => bundled.has(c.id)).map((c) => (
              <option key={c.id} value={c.id}>
                {label(c)}
              </option>
            ))}
          </optgroup>
          <optgroup label="Loaded from the quran.com API">
            {chapters.filter((c) => !bundled.has(c.id)).map((c) => (
              <option key={c.id} value={c.id}>
                {label(c)}
              </option>
            ))}
          </optgroup>
        </select>
      </label>
      <div className="flex items-end gap-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          From verse
          <select
            className={field}
            value={range.from}
            disabled={disabled}
            onChange={(e) => {
              const from = Number(e.target.value);
              onRange({ from, to: Math.max(from, range.to) });
            }}
          >
            {verses.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          To
          <select
            className={field}
            value={range.to}
            disabled={disabled}
            onChange={(e) => {
              const to = Number(e.target.value);
              onRange({ from: Math.min(range.from, to), to });
            }}
          >
            {verses.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
