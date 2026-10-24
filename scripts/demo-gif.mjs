// Records the sample recitation into docs/screenshots/demo.gif; needs a production build and puppeteer, like screenshots.mjs.
import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import gifenc from 'gifenc';
import { PNG } from 'pngjs';
import { preview } from 'vite';

const { GIFEncoder, quantize, applyPalette } = gifenc;
const require = createRequire(import.meta.url);
const puppeteer = require(process.env.PUPPETEER_MODULE ?? 'puppeteer');
const OUT = fileURLToPath(new URL('../docs/screenshots/demo.gif', import.meta.url));
const CAPTURE_MS = 200;
const PLAYBACK_MS = 110;
const CLIP = { x: 0, y: 64, width: 1120, height: 660 };

const server = await preview({ preview: { port: 4327, strictPort: true }, logLevel: 'warn' });
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--lang=en-US'] });
const frames = [];
try {
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await page.setViewport({ width: 1120, height: 760, deviceScaleFactor: 1 });
  await page.goto(`${server.resolvedUrls.local[0]}?surah=1`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  const grab = async () => frames.push(PNG.sync.read(Buffer.from(await page.screenshot({ clip: CLIP }))));

  for (let i = 0; i < 6; i++) await grab();
  await page.click('button::-p-text(Try a sample recitation)');
  let done = false;
  while (!done) {
    const started = Date.now();
    await grab();
    done = (await page.$('section[aria-label="Result"]')) !== null;
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, CAPTURE_MS - (Date.now() - started))));
  }
  await new Promise((resolve) => setTimeout(resolve, 900));
  for (let i = 0; i < 30; i++) await grab();
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}

// One shared palette, with the last slot kept for "unchanged since the previous frame".
const { width, height } = frames[0];
const sample = Buffer.concat([frames[0].data, frames[Math.floor(frames.length / 2)].data, frames.at(-1).data]);
const palette = quantize(sample, 255);
const SAME = palette.length;
palette.push([0, 0, 0]);

const gif = GIFEncoder();
let previous = null;
for (const frame of frames) {
  const index = applyPalette(frame.data, palette.slice(0, SAME));
  const out = previous ? index.map((v, i) => (v === previous[i] ? SAME : v)) : index;
  gif.writeFrame(out, width, height, {
    palette,
    delay: PLAYBACK_MS,
    transparent: previous !== null,
    transparentIndex: SAME,
    dispose: 1,
  });
  previous = index;
}
gif.finish();
await writeFile(OUT, gif.bytes());
console.log(`Saved ${frames.length} frames to ${OUT} (${(gif.bytes().length / 1024).toFixed(0)} KB)`);
