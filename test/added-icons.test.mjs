// Icons added after 1.3.0 live in the main CSS, in a generated block after a marker comment.
import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readAdditions } from '../scripts/additions.mjs';
import { CSS_FILES, CSS_MARKER, FONTS_DIR, FONT_OF_STYLE, cssBase } from '../scripts/build-font.mjs';
import { readCmap } from '../scripts/ttf-splice.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const additions = readAdditions(root);
const read = (file) => readFileSync(join(root, file), 'utf8');

test.each(CSS_FILES)('%s: the marker comes once, and only the added classes follow it', (file) => {
  const css = read(file);
  expect(css.split(CSS_MARKER)).toHaveLength(2);
  const block = css.slice(css.indexOf(CSS_MARKER) + CSS_MARKER.length);
  const rules = [...block.matchAll(/\.la-([a-z0-9-]+):before\s*\{\s*content:\s*"\\([0-9a-f]+)";?\s*\}/g)].map((m) => [m[1], m[2]]);
  expect(rules).toEqual(additions.map((icon) => [icon.base, icon.codepoint]));
  // nothing but those rules: strip them and only whitespace is left
  expect(block.replace(/\.la-[a-z0-9-]+:before\s*\{[^}]*\}/g, '').trim()).toBe('');
});

test('the 1.3.0 part of the CSS has none of the added classes, and the block is not repeated on rebuild', () => {
  for (const file of CSS_FILES) {
    const base = cssBase(read(file));
    for (const { base: name } of additions) expect(base, `${file} .la-${name}`).not.toContain(`.la-${name}:before`);
    expect(cssBase(base)).toBe(base);
  }
});

test('every added class resolves to a glyph in the font of its style, and in no other font', () => {
  const maps = Object.fromEntries(Object.entries(FONT_OF_STYLE).map(([style, name]) => [style, readCmap(readFileSync(join(root, FONTS_DIR, `${name}.ttf`)))]));
  for (const { base, style, codepoint } of additions) {
    for (const [other, map] of Object.entries(maps)) {
      expect(map.has(parseInt(codepoint, 16)), `${base} (${style}) in ${other} font`).toBe(other === style);
    }
  }
});

test('the minified CSS has the same added rules as the readable one', () => {
  const [css, min] = CSS_FILES.map((file) => read(file));
  const pairs = (text) => [...text.slice(text.indexOf(CSS_MARKER)).matchAll(/\.la-([a-z0-9-]+):before\s*\{\s*content:\s*"\\([0-9a-f]+)"/g)].map((m) => m.slice(1));
  expect(pairs(min)).toEqual(pairs(css));
});

test('class names are unique and do not reuse a 1.3.0 class', () => {
  const v1 = cssBase(read(CSS_FILES[0]));
  expect(new Set(additions.map((icon) => icon.base)).size).toBe(additions.length);
  for (const { base } of additions) expect(v1).not.toContain(`.la-${base}:before`);
});
