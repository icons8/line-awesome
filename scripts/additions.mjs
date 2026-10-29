// Icons added after 1.3.0. The 1.3.0 font and CSS stay frozen, so these icons get their own font
// and stylesheet in dist/line-awesome-additions/, built from svg/ by scripts/build-font.mjs.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const ADDITIONS_DIR = 'dist/line-awesome-additions';
export const FONT_FAMILY = 'Line Awesome Additions';
export const FONT_FILES = ['la-additions.woff2', 'la-additions.woff', 'la-additions.ttf'].map((file) => `fonts/${file}`);
export const CSS_FILES = ['line-awesome-additions.css', 'line-awesome-additions.min.css'].map((file) => `css/${file}`);

// added-icons.json maps a class name to its style and codepoint. Codepoints follow Font Awesome
// where it has the icon; others take the next free one from \e900.
export function readAdditions(root) {
  const entries = Object.entries(JSON.parse(readFileSync(join(root, 'added-icons.json'), 'utf8')));
  return entries.map(([base, { style, codepoint }]) => {
    if (!['solid', 'regular', 'brands'].includes(style)) throw new Error(`added-icons.json: ${base} has style ${style}`);
    if (!/^[0-9a-f]{4,5}$/.test(codepoint)) throw new Error(`added-icons.json: ${base} has codepoint ${codepoint}`);
    return { base, style, codepoint, file: style === 'solid' ? `${base}-solid.svg` : `${base}.svg` };
  });
}

// Files the additions put next to the 1.3.0 ones: their svg/ sources and the built font and CSS.
export function additionFiles(root) {
  return [
    ...readAdditions(root).map((icon) => `svg/${icon.file}`),
    ...[...FONT_FILES, ...CSS_FILES].map((file) => `${ADDITIONS_DIR}/${file}`),
  ].sort();
}
