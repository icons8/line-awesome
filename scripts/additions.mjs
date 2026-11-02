// Icons added after 1.3.0 are listed in added-icons.json. scripts/build-font.mjs appends their
// glyphs to copies of the 1.3.0 fonts in font-source/ and their classes to the CSS.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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

// svg/ files of the added icons: the one kind of file that may sit next to the 1.3.0 ones.
export function additionFiles(root) {
  return readAdditions(root).map((icon) => `svg/${icon.file}`).sort();
}
