// Renders examples/all-icons twice in a real browser, once with the 1.3.0 fonts (font-source/1.3.0)
// and once with the fonts in dist/, and compares the two screenshots pixel by pixel:
// every icon that existed in 1.3.0 must look exactly as before, the added ones must be drawn.
//
//   npm run test:visual                        chromium
//   BROWSER=webkit npm run test:visual         or firefox (npx playwright install webkit firefox)
import { afterAll, beforeAll, expect, test } from 'vitest';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import playwright from 'playwright';
import ttf2woff from 'ttf2woff';
import wawoff2 from 'wawoff2';
import { readAdditions } from '../scripts/additions.mjs';
import { FONT_NAMES, SOURCE_DIR } from '../scripts/build-font.mjs';
import { PAGE } from '../scripts/build-all-icons-page.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = join(root, 'test-visual/output');
const browserName = process.env.BROWSER ?? 'chromium';
const added = new Set(readAdditions(root).map((icon) => icon.base));

// pixelmatch threshold: 0 compares colours exactly. The outlines are the same bytes and the same
// rasteriser draws them, so the expected number of different pixels in an old icon is 0; a glyph
// that moved by a hair or lost a contour changes hundreds. Anti-aliasing noise is not tolerated
// because none shows up between two runs of the same browser (see README).
const THRESHOLD = 0;
const MAX_CHANGED_PER_OLD_CELL = 0;
// A new icon covers 150-340 pixels at 32 px (measured); an empty cell or a lone box for a missing glyph
// does not look like that. The old render, without the glyph, must differ from the new one by as much.
const MIN_CHANGED_PER_NEW_CELL = 100;
const STRIP = 3000;

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };
const legacy = new Map(); // url -> bytes of the 1.3.0 font, in the format the url asks for

async function legacyFont(name, ext) {
  const key = `${name}.${ext}`;
  if (!legacy.has(key)) {
    const ttf = readFileSync(join(root, SOURCE_DIR, `${name}.ttf`));
    legacy.set(key, ext === 'ttf' ? ttf : ext === 'woff' ? Buffer.from(ttf2woff(ttf).buffer) : Buffer.from(await wawoff2.compress(ttf)));
  }
  return legacy.get(key);
}

let server, base, browser;

beforeAll(async () => {
  // /new/... serves the repository; /old/... serves it with the three fonts replaced by the 1.3.0 ones.
  server = createServer(async (req, res) => {
    try {
      const [, mode, ...rest] = decodeURIComponent(new URL(req.url, 'http://x').pathname).split('/');
      const path = normalize(rest.join('/'));
      const font = /^dist\/line-awesome\/fonts\/(la-[a-z]+-\d+)\.(woff2|woff|ttf)$/.exec(path);
      let body;
      if (mode === 'old' && font && FONT_NAMES.includes(font[1])) body = await legacyFont(font[1], font[2]);
      else {
        const file = join(root, path);
        if (path.startsWith('..') || !existsSync(file) || !statSync(file).isFile()) throw new Error('not found');
        body = readFileSync(file);
      }
      res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await playwright[browserName].launch();
});

afterAll(async () => {
  await browser?.close();
  await new Promise((resolve) => server?.close(resolve));
});

// Opens the page against the fonts of `mode` and returns its pixels plus where every cell is.
async function render(mode) {
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(`${base}/${mode}/${PAGE}`, { waitUntil: 'load' });
  // Fonts load when a glyph first needs them: wait for all three, and fail if one did not load,
  // otherwise two renders of the fallback font would "match".
  const faces = await page.evaluate(async () => {
    await Promise.all([...document.fonts].map((face) => face.load()));
    await document.fonts.ready;
    return [...document.fonts].map((face) => `${face.family}/${face.weight}: ${face.status}`);
  });
  expect(faces, mode).toHaveLength(3);
  for (const face of faces) expect(face, mode).toMatch(/loaded$/);
  const layout = await page.evaluate(() => {
    const rect = (el) => {
      const r = el.getBoundingClientRect();
      return [Math.round(r.left + scrollX), Math.round(r.top + scrollY), Math.round(r.width), Math.round(r.height)];
    };
    return {
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
      cells: [...document.querySelectorAll('.cell')].map((cell) => ({
        name: cell.dataset.name,
        group: cell.closest('section').id,
        cell: rect(cell),
        glyph: rect(cell.querySelector('i')),
      })),
    };
  });
  const png = new PNG({ width: layout.width, height: layout.height });
  for (let y = 0; y < layout.height; y += STRIP) {
    const height = Math.min(STRIP, layout.height - y);
    const strip = PNG.sync.read(await page.screenshot({ type: 'png', fullPage: true, clip: { x: 0, y, width: layout.width, height } }));
    strip.data.copy(png.data, y * layout.width * 4);
  }
  await context.close();
  return { png, layout };
}

const inside = (mask, width, [x, y, w, h]) => {
  let n = 0;
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) n += mask[j * width + i];
  return n;
};

test(`all icons: old ones render as with the 1.3.0 fonts, new ones are drawn (${browserName})`, async () => {
  const [before, after] = [await render('old'), await render('new')];
  expect(after.layout.cells.map((c) => c.name)).toEqual(before.layout.cells.map((c) => c.name));
  expect(after.layout.cells.map((c) => c.cell)).toEqual(before.layout.cells.map((c) => c.cell));
  const { width, height } = after.layout;
  expect([before.png.width, before.png.height]).toEqual([width, height]);

  // pixelmatch paints each different pixel red in the diff image; read the mask off it.
  const diff = new PNG({ width, height });
  const total = pixelmatch(before.png.data, after.png.data, diff.data, width, height, { threshold: THRESHOLD, includeAA: true });
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i++) mask[i] = diff.data[i * 4] === 255 && diff.data[i * 4 + 1] === 0 ? 1 : 0;

  const oldCells = after.layout.cells.filter((c) => !added.has(c.name));
  const newCells = after.layout.cells.filter((c) => added.has(c.name));
  expect(newCells).toHaveLength(added.size);
  expect(oldCells.length).toBeGreaterThan(1900);

  const moved = oldCells.map((c) => [c, inside(mask, width, c.cell)]).filter(([, n]) => n > MAX_CHANGED_PER_OLD_CELL);
  const drawn = newCells.map((c) => [c, inside(mask, width, c.glyph)]);
  const faint = drawn.filter(([, n]) => n < MIN_CHANGED_PER_NEW_CELL);
  const outside = total - [...oldCells, ...newCells].reduce((n, c) => n + inside(mask, width, c.cell), 0);

  if (moved.length || faint.length || outside) {
    mkdirSync(out, { recursive: true });
    for (const [name, png] of [['old', before.png], ['new', after.png], ['diff', diff]]) writeFileSync(join(out, `${browserName}-${name}.png`), PNG.sync.write(png));
  }
  console.log(`${browserName}: ${oldCells.length} old icons, ${newCells.length} new; changed pixels: old ${moved.reduce((n, [, k]) => n + k, 0)}, new ${drawn.reduce((n, [, k]) => n + k, 0)} (${drawn.map(([c, k]) => `${c.name} ${k}`).join(', ')})`);
  expect(moved.map(([c, n]) => `${c.group} ${c.name}: ${n} px`)).toEqual([]);
  expect(faint.map(([c, n]) => `${c.name}: ${n} px`)).toEqual([]);
  expect(outside, 'pixels changed outside the icon cells').toBe(0);
});
