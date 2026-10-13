// Renders every original svg and its generated body, and compares pixels:
// svgo must not change how an icon looks.
import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { buildModel } from '../scripts/generate/model.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const SIZE = 64;
// Coordinate rounding only shifts anti-aliasing on edges (per-pixel delta up to ~64 of 255).
// A changed shape — a lost subpath, a flipped fill-rule — shows up as a near-opaque delta.
const MAX_PIXEL_DELTA = 96;

function render(svg) {
  // Icons have no text; loading system fonts would cost ~100 ms per render.
  return new Resvg(svg, { fitTo: { mode: 'width', value: SIZE }, font: { loadSystemFonts: false } }).render().pixels;
}

function maxDelta(a, b) {
  let max = 0;
  for (let i = 0; i < a.length; i++) max = Math.max(max, Math.abs(a[i] - b[i]));
  return max;
}

test('generated icons look like the source svg files', () => {
  const failures = [];
  for (const icon of buildModel(root).icons) {
    // chart-bar.svg declares width/height in pt on the root; drop them so both render at SIZE.
    const original = readFileSync(join(root, 'svg', icon.file), 'utf8').replace(/<svg\b[^>]*>/, (tag) =>
      tag.replace(/\s(width|height)="[^"]*"/g, ''),
    );
    const { body, width, height } = icon.data;
    const generated = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" color="#000">${body}</svg>`;
    const delta = maxDelta(render(original), render(generated));
    if (delta > MAX_PIXEL_DELTA) failures.push(`${icon.file}: pixel delta ${delta}`);
  }
  expect(failures).toEqual([]);
});
