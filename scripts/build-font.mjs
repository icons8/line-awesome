// Builds the font and CSS for icons added after 1.3.0 from svg/ and added-icons.json.
//
//   node scripts/build-font.mjs           write dist/line-awesome-additions/
//   node scripts/build-font.mjs --check   fail if the committed files differ from a fresh build
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { SVGIcons2SVGFontStream } from 'svgicons2svgfont';
import svg2ttf from 'svg2ttf';
import ttf2woff from 'ttf2woff';
import wawoff2 from 'wawoff2';
import { ADDITIONS_DIR, FONT_FAMILY, readAdditions } from './additions.mjs';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

// Same metrics as the 1.3.0 fonts: 32 px of the svg grid are 1024 units, baseline at 28 px.
function svgFont(root, icons) {
  return new Promise((resolve, reject) => {
    const stream = new SVGIcons2SVGFontStream({
      fontName: FONT_FAMILY,
      fontId: 'la-additions',
      fontHeight: 1024,
      descent: 128,
      log: () => {},
    });
    let out = '';
    stream.on('data', (chunk) => (out += chunk)).on('end', () => resolve(out)).on('error', reject);
    for (const icon of icons) {
      const glyph = Readable.from([readFileSync(join(root, 'svg', icon.file))]);
      glyph.metadata = { name: icon.base, unicode: [String.fromCodePoint(parseInt(icon.codepoint, 16))] };
      stream.write(glyph);
    }
    stream.end();
  });
}

// The font carries one glyph per icon, whatever its style. Each `:before` sets the family and
// weight itself, so `las`, `lar` and `lab` (weight 900 or 400) all show the glyph unchanged.
function css(icons) {
  const src = [
    'url("../fonts/la-additions.woff2") format("woff2")',
    'url("../fonts/la-additions.woff") format("woff")',
    'url("../fonts/la-additions.ttf") format("truetype")',
  ].join(', ');
  const selectors = icons.map((icon) => `.la-${icon.base}:before`);
  return [
    `/* Line Awesome: icons added after 1.3.0. Load after line-awesome.css. */`,
    `@font-face {\n  font-family: '${FONT_FAMILY}';\n  font-style: normal;\n  font-weight: 400;\n  font-display: auto;\n  src: ${src}; }`,
    `${selectors.join(',\n')} {\n  font-family: '${FONT_FAMILY}';\n  font-weight: 400;\n  font-synthesis: none; }`,
    ...icons.map((icon) => `.la-${icon.base}:before {\n  content: "\\${icon.codepoint}"; }`),
  ].join('\n\n') + '\n';
}

function minify(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};,:])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim() + '\n';
}

export async function buildFont(root = repoRoot) {
  const icons = readAdditions(root);
  for (const icon of icons) if (!existsSync(join(root, 'svg', icon.file))) throw new Error(`missing svg/${icon.file}`);
  // A fixed timestamp keeps the font byte-identical between builds.
  const ttf = Buffer.from(svg2ttf(await svgFont(root, icons), { ts: 0, version: '1.0' }).buffer);
  const text = css(icons);
  return {
    'fonts/la-additions.ttf': ttf,
    'fonts/la-additions.woff': Buffer.from(ttf2woff(ttf).buffer),
    'fonts/la-additions.woff2': Buffer.from(await wawoff2.compress(ttf)),
    'css/line-awesome-additions.css': Buffer.from(text),
    'css/line-awesome-additions.min.css': Buffer.from(minify(text)),
  };
}

export async function staleFiles(root = repoRoot) {
  const files = await buildFont(root);
  return Object.entries(files)
    .filter(([file, bytes]) => {
      const path = join(root, ADDITIONS_DIR, file);
      return !existsSync(path) || !readFileSync(path).equals(bytes);
    })
    .map(([file]) => `${ADDITIONS_DIR}/${file}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === '--check') {
    const stale = await staleFiles();
    for (const file of stale) console.log(`out of date: ${file}`);
    console.log(stale.length ? 'run npm run build:font' : `${ADDITIONS_DIR} matches svg/ and added-icons.json`);
    process.exitCode = stale.length ? 1 : 0;
  } else {
    for (const [file, bytes] of Object.entries(await buildFont())) {
      const path = join(repoRoot, ADDITIONS_DIR, file);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, bytes);
      console.log(`${ADDITIONS_DIR}/${file}: ${bytes.length} bytes`);
    }
  }
}
