// Icons added after 1.3.0 ship in their own font and stylesheet, built from svg/.
import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADDITIONS_DIR, readAdditions } from '../scripts/additions.mjs';
import { staleFiles } from '../scripts/build-font.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const additions = readAdditions(root);

test('the committed font and CSS match svg/ and added-icons.json (run npm run build:font)', async () => {
  expect(await staleFiles(root)).toEqual([]);
});

test('every added icon has a class with its codepoint, and the font a glyph for it', () => {
  const css = readFileSync(join(root, ADDITIONS_DIR, 'css/line-awesome-additions.css'), 'utf8');
  const ttf = readFileSync(join(root, ADDITIONS_DIR, 'fonts/la-additions.ttf'));
  for (const { base, codepoint } of additions) {
    expect(css).toContain(`.la-${base}:before {\n  content: "\\${codepoint}"; }`);
  }
  // cmap format 4 stores codepoints as big-endian 16-bit values.
  for (const { codepoint } of additions) expect(ttf.includes(Buffer.from(codepoint.padStart(4, '0'), 'hex'))).toBe(true);
});

test('codepoints and class names are unique and do not reuse a 1.3.0 class', () => {
  const v1 = readFileSync(join(root, 'dist/line-awesome/css/line-awesome.css'), 'utf8');
  expect(new Set(additions.map((icon) => icon.codepoint)).size).toBe(additions.length);
  for (const { base } of additions) expect(v1).not.toContain(`.la-${base}:before`);
});
