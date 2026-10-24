// Captures the README screenshots from the production build (run `npm run build` first); PUPPETEER_MODULE may point at any puppeteer install.
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { preview } from 'vite';

const require = createRequire(import.meta.url);
const puppeteer = require(process.env.PUPPETEER_MODULE ?? 'puppeteer');
const OUT = fileURLToPath(new URL('../docs/screenshots/', import.meta.url));
const SAMPLE = 'button::-p-text(Try a sample recitation)';

await mkdir(OUT, { recursive: true });
const server = await preview({ preview: { port: 4321, strictPort: true }, logLevel: 'warn' });
const url = `${server.resolvedUrls.local[0]}?surah=1`;
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--lang=en-US'] });

async function open(viewport) {
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await page.setViewport(viewport);
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  return page;
}

const count = (page, status) => page.$$eval(`.word[data-status="${status}"]`, (els) => els.length);

try {
  const desktop = await open({ width: 1280, height: 900, deviceScaleFactor: 2 });
  await desktop.screenshot({ path: `${OUT}surah.png` });

  await desktop.click(SAMPLE);
  await desktop.waitForFunction(
    () => document.querySelector('.extra-chip:not([data-tentative])') && document.querySelector('.word[data-status="substituted"]'),
    { timeout: 30_000 },
  );
  await desktop.screenshot({ path: `${OUT}reciting.png` });

  await desktop.waitForSelector('section[aria-label="Result"]', { timeout: 30_000 });
  await new Promise((resolve) => setTimeout(resolve, 900));
  await desktop.setViewport({ width: 1280, height: 1180, deviceScaleFactor: 2 });
  await desktop.evaluate(() => window.scrollTo(0, 0));
  await desktop.screenshot({ path: `${OUT}result.png` });
  console.log('desktop:', { correct: await count(desktop, 'correct'), substituted: await count(desktop, 'substituted'), missed: await count(desktop, 'missed') });

  const mobile = await open({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await mobile.click(SAMPLE);
  await mobile.waitForFunction(() => document.querySelector('.word[data-status="substituted"]'), { timeout: 30_000 });
  await new Promise((resolve) => setTimeout(resolve, 700));
  await mobile.screenshot({ path: `${OUT}mobile.png` });
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
console.log(`Saved screenshots to ${OUT}`);
