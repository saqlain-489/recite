import { useState } from 'react';
import { scoreTone, shortDate } from '../lib/format';
import type { Attempt } from '../storage/history';

const TONE = {
  great: 'bg-ok/12 text-ok',
  good: 'bg-[#ca8a04]/15 text-[#a16207] dark:text-[#facc15]',
  fair: 'bg-sub/12 text-sub',
  poor: 'bg-del/10 text-del',
} as const;

function detail(a: Attempt): string {
  const parts = [
    a.substituted && `${a.substituted} substituted`,
    a.missed && `${a.missed} missed`,
    a.extra && `${a.extra} extra`,
    a.unreached && `${a.unreached} not reached`,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : 'No mistakes';
}

export function HistoryPanel({ attempts, onClear }: { readonly attempts: readonly Attempt[]; readonly onClear: () => void }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <section aria-label="Attempt history" className="rounded-3xl border border-line bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">Your attempts</h2>
        {attempts.length > 0 &&
          (confirming ? (
            <span className="flex gap-2 text-sm">
              <button
                type="button"
                className="font-semibold text-del"
                onClick={() => {
                  onClear();
                  setConfirming(false);
                }}
              >
                Clear all
              </button>
              <button type="button" className="text-muted" onClick={() => setConfirming(false)}>
                Keep
              </button>
            </span>
          ) : (
            <button type="button" className="text-sm text-muted hover:text-ink" onClick={() => setConfirming(true)}>
              Clear
            </button>
          ))}
      </div>

      {attempts.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Finished recitations are saved here, in this browser only.</p>
      ) : (
        <ul className="mt-3 flex flex-col divide-y divide-line">
          {attempts.map((a) => (
            <li key={a.id}>
              <details className="group py-2.5">
                <summary className="flex cursor-pointer list-none items-center gap-3">
                  <span className={`w-12 shrink-0 rounded-full py-0.5 text-center text-sm font-semibold tabular-nums ${TONE[scoreTone(a.score)]}`}>
                    {a.score}%
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {a.surahName}
                      <span className="font-normal text-muted">
                        {' '}
                        · {a.from === a.to ? `verse ${a.from}` : `verses ${a.from}–${a.to}`}
                      </span>
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {shortDate(a.date)} · {detail(a)}
                      {a.source === 'sample' && ' · sample'}
                    </span>
                  </span>
                  <span className="text-muted transition group-open:rotate-90" aria-hidden="true">
                    ›
                  </span>
                </summary>
                {a.mistakes.length > 0 ? (
                  <ul className="mt-2 flex flex-col gap-1 ps-[3.75rem] text-sm">
                    {a.mistakes.map((m, i) => (
                      <li key={i} className="flex items-baseline gap-2">
                        <span className="w-24 shrink-0 text-xs text-muted">
                          {m.verseKey} {m.kind === 'slip' ? 'letter' : m.kind}
                        </span>
                        <bdi dir="rtl" lang="ar" className="quran text-lg">
                          {m.expected ?? `+ ${m.spoken ?? ''}`}
                        </bdi>
                        {m.expected && m.spoken && (
                          <span className="text-xs text-muted">
                            heard{' '}
                            <bdi dir="rtl" lang="ar" className="quran text-base text-ink">
                              {m.spoken}
                            </bdi>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 ps-[3.75rem] text-sm text-muted">Nothing to fix in this one.</p>
                )}
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
