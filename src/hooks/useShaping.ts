import { useEffect, useState } from 'react';

const BEH = '\u{0628}';

function width(html: string): number {
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font:40px var(--font-quran)';
  probe.innerHTML = html;
  document.body.append(probe);
  const measured = probe.getBoundingClientRect().width;
  probe.remove();
  return measured;
}

// Chrome and Firefox keep Arabic letters joined across coloured spans; engines that do not get zero-width joiners.
export function useShapesAcrossSpans(): boolean {
  const [shapes, setShapes] = useState(true);
  useEffect(() => {
    let live = true;
    void document.fonts.ready.then(() => {
      if (!live) return;
      const joined = width(BEH.repeat(4));
      const split = width(`<span>${BEH}</span>`.repeat(4));
      setShapes(Math.abs(joined - split) < 0.5);
    });
    return () => {
      live = false;
    };
  }, []);
  return shapes;
}
