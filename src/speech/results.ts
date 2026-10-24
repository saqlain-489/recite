export interface ResultLike {
  readonly isFinal: boolean;
  readonly [alternative: number]: { readonly transcript: string } | undefined;
}

export interface ResultListLike {
  readonly length: number;
  readonly [index: number]: ResultLike;
}

export interface ReadResults {
  readonly finals: string[];
  readonly interim: string;
  readonly next: number;
}

// Final results never change, so each is sent once; everything after the first unfinished result is interim.
export function readResults(results: ResultListLike, sent: number): ReadResults {
  const finals: string[] = [];
  const interim: string[] = [];
  let next = sent;
  for (let i = sent; i < results.length; i++) {
    const result = results[i];
    const text = (result[0]?.transcript ?? '').trim();
    if (result.isFinal && i === next) {
      if (text) finals.push(text);
      next = i + 1;
    } else if (!result.isFinal && text) {
      interim.push(text);
    }
  }
  return { finals, interim: interim.join(' '), next };
}

// Some Android builds repeat the whole session transcript in every final result; keep only the new words.
export function newWords(previous: string, segment: string): string {
  const before = previous.split(/\s+/).filter(Boolean);
  const words = segment.split(/\s+/).filter(Boolean);
  if (before.length === 0 || words.length <= before.length) return words.join(' ');
  const repeats = before.every((word, i) => words[i] === word);
  return (repeats ? words.slice(before.length) : words).join(' ');
}
