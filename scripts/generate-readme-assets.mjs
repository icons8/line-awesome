// Draws the pictures used by README.md (banner, icon grid, facts) from the package's own icons.
// Run: node scripts/generate-readme-assets.mjs   Output: .github/assets/*.svg
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '.github', 'assets');
mkdirSync(out, { recursive: true });

const FONT = "Inter, 'Segoe UI', -apple-system, Helvetica, Arial, sans-serif";
const MONO = "'SFMono-Regular', Menlo, Consolas, monospace";

const icons = new Map();

async function loadIcons(names) {
  for (const name of names) {
    const module = await import(pathToFileURL(join(root, 'lib', 'icons', `${name}.js`)).href);
    icons.set(name, module.default.body);
  }
}

const loadIcon = (name) => icons.get(name);

// An icon drawn at (x, y), `size` px tall, in the given color. Icons live on a 32 x 32 grid.
function icon(name, x, y, size, color) {
  const body = loadIcon(name).replaceAll('currentColor', color);
  return `<g transform="translate(${x} ${y}) scale(${size / 32})">${body}</g>`;
}

const svg = (width, height, label, content, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}"><defs>${defs}</defs>${content}</svg>\n`;

// Banner

function banner() {
  const defs = `<linearGradient id="hero" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="#1a66f0"/><stop offset="0.45" stop-color="#4a9bff"/>
      <stop offset="0.8" stop-color="#b9b4f6"/><stop offset="1" stop-color="#e2b9ec"/>
    </linearGradient>`;
  const content = `
  <rect x="0.5" y="0.5" width="1199" height="519" rx="28" fill="#f7f7f7" stroke="#e8e8e8"/>
  <rect x="64" y="64" width="322" height="38" rx="10" fill="#fff" stroke="#ececec"/>
  <rect x="71" y="71" width="46" height="24" rx="7" fill="#f0f0f0"/>
  <text x="94" y="88" font-family="${FONT}" font-size="14" font-weight="600" fill="#333" text-anchor="middle">New</text>
  <text x="128" y="88" font-family="${FONT}" font-size="15" fill="#222">Line Awesome 2 · tree-shakable</text>
  <text x="64" y="206" font-family="${FONT}" font-size="64" font-weight="700" letter-spacing="-2" fill="#1a1a1a">Line icons</text>
  <text x="64" y="274" font-family="${FONT}" font-size="64" font-weight="700" letter-spacing="-2" fill="#1a1a1a">for your code</text>
  <text x="64" y="330" font-family="${FONT}" font-size="21" fill="#666">1,544 free icons for Vue, React and plain CSS.</text>
  <text x="64" y="361" font-family="${FONT}" font-size="21" fill="#666">Import only the icons you use.</text>
  <rect x="64" y="410" width="330" height="54" rx="14" fill="#262626"/>
  <text x="90" y="444" font-family="${MONO}" font-size="19" fill="#8a8a8a">$</text>
  <text x="112" y="444" font-family="${MONO}" font-size="19" fill="#7aa2ff">npm</text>
  <text x="159" y="444" font-family="${MONO}" font-size="19" fill="#f2f2f2">i line-awesome</text>
  <rect x="640" y="64" width="496" height="392" rx="26" fill="url(#hero)"/>
  <rect x="672" y="92" width="130" height="30" rx="8" fill="#fff" fill-opacity="0.22"/>
  <text x="737" y="113" font-family="${MONO}" font-size="15" fill="#fff" text-anchor="middle">lab la-github</text>
  ${icon('lab-github', 794, 130, 192, '#fff')}
  <text x="672" y="428" font-family="${FONT}" font-size="64" font-weight="700" letter-spacing="-2" fill="#fff">1,544</text>
  <text x="866" y="426" font-family="${FONT}" font-size="21" fill="#fff" fill-opacity="0.8">free icons</text>`;
  return svg(1200, 520, 'Line Awesome: line icons for your code', content, defs);
}

// Icon grid

const GRID = [
  'las-star', 'las-bell', 'las-gift', 'las-rocket', 'las-search', 'las-home', 'las-heart', 'las-user', 'las-cog', 'las-camera', 'las-comment', 'las-envelope',
  'las-calendar', 'las-cloud', 'las-code', 'las-folder', 'las-globe', 'las-image', 'las-lock', 'las-map-marker', 'las-music', 'las-paper-plane', 'las-phone', 'las-play',
  'las-shopping-cart', 'las-tag', 'las-trash', 'las-video', 'las-wifi', 'las-bolt', 'las-book', 'las-bookmark', 'las-briefcase', 'las-bug', 'las-chart-bar', 'las-check',
  'lar-star', 'lar-bell', 'lar-heart', 'lar-user', 'lar-comment', 'lar-envelope', 'lar-calendar', 'lar-folder', 'lar-image', 'lar-paper-plane', 'lar-bookmark', 'lar-chart-bar',
  'lab-github', 'lab-react', 'lab-vuejs', 'lab-npm', 'lab-figma', 'lab-sketch', 'lab-js', 'lab-node-js', 'lab-chrome', 'lab-apple', 'lab-android', 'lab-youtube'
];

function iconGrid() {
  const cols = 12;
  const cell = 92;
  const pad = 36;
  const rows = GRID.length / cols;
  const width = pad * 2 + cols * cell;
  const height = pad * 2 + rows * cell;
  const cells = GRID.map((name, i) => {
    const x = pad + (i % cols) * cell + (cell - 32) / 2;
    const y = pad + Math.floor(i / cols) * cell + (cell - 32) / 2;
    return icon(name, x, y, 32, '#1a1a1a');
  }).join('\n  ');
  const content = `
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="28" fill="#f7f7f7" stroke="#e8e8e8"/>
  ${cells}`;
  return svg(width, height, 'A grid of Line Awesome icons in solid, regular and brand styles', content);
}

// Facts

function tile(x, y, w, h, value, lines, accent) {
  const caption = lines
    .map((line, i) => `<text x="${x + 28}" y="${y + 116 + i * 22}" font-family="${FONT}" font-size="16" fill="#666">${line}</text>`)
    .join('\n  ');
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="22" fill="#fff" stroke="#ececec"/>
  <text x="${x + 28}" y="${y + 76}" font-family="${FONT}" font-size="46" font-weight="700" letter-spacing="-1.5" fill="${accent}">${value}</text>
  ${caption}`;
}

function facts() {
  const gap = 16;
  const w = (1200 - 3 * gap) / 4;
  const tiles = [
    ['1,544', ['SVG icons,', '1,393 distinct names'], '#1a1a1a'],
    ['3 styles', ['solid 960, regular 151,', 'brands 433'], '#1a66f0'],
    ['616 B', ['gzip for the first icon,', 'about 200 B for each next'], '#1a1a1a'],
    ['16 KB', ['gzip for the font CSS;', 'fonts load per style'], '#1a66f0']
  ];
  const content = tiles.map(([value, lines, accent], i) => tile(i * (w + gap), 0, w, 170, value, lines, accent)).join('\n  ');
  return svg(1200, 170, 'Line Awesome in numbers', content);
}

await loadIcons(['lab-github', ...GRID]);
writeFileSync(join(out, 'banner.svg'), banner());
writeFileSync(join(out, 'icons.svg'), iconGrid());
writeFileSync(join(out, 'facts.svg'), facts());
console.log('wrote banner.svg, icons.svg, facts.svg to .github/assets');
