// Glyph codepoints from the v1 SVG fonts. They are the only way to tell regular from brands:
// both styles are unsuffixed in svg/.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FONTS = {
  brands: 'la-brands-400.svg',
  regular: 'la-regular-400.svg',
  solid: 'la-solid-900.svg',
};

export function parseFonts(dir) {
  return Object.fromEntries(
    Object.entries(FONTS).map(([style, file]) => {
      const svg = readFileSync(join(dir, file), 'utf8');
      const codepoints = [...svg.matchAll(/<glyph\b[^>]*?\bunicode="&#x([0-9a-f]+);"/gi)].map((m) => m[1].toLowerCase());
      return [style, new Set(codepoints)];
    }),
  );
}
