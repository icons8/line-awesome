// The Font Awesome 6/7 shim: Line Awesome fonts under FA6/7 markup. Generated from the model and
// the FA name table, never edited by hand. One file serves both versions: FA7 markup and FA6
// markup both end in `.fa-<name>` setting `--fa` and `::before { content: var(--fa) }`.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { faMatches } from './model.mjs';

export const FA_SHIM_DIR = 'dist/font-awesome-6-7-line-awesome';
const FONTS = '../../line-awesome/fonts';
const SELECTOR = {
  solid: ':is(.fas, .fa-solid)',
  regular: ':is(.far, .fa-regular)',
  brands: ':is(.fab, .fa-brands)',
};

function fontFace(family, weight, file) {
  return `@font-face {
  font-family: "${family}";
  font-style: normal;
  font-weight: ${weight};
  font-display: block;
  src: url("${FONTS}/${file}.woff2") format("woff2"), url("${FONTS}/${file}.woff") format("woff"), url("${FONTS}/${file}.ttf") format("truetype");
}`;
}

// Content-only escapes: `\f015`.
const content = (codepoint) => `"\\${codepoint}"`;

// Newer versions first: on a conflict FA7 decides what `.fa-<name>` shows.
function iconRules(model) {
  const versions = Object.keys(model.faNames).sort((a, b) => b.localeCompare(a, 'en', { numeric: true }));
  const byName = new Map(); // name → { solid?, regular?, brands? }
  // Current names first, then the old names FA still accepts (`fa-home`), which never override them.
  for (const pass of ['names', 'aliases']) {
    for (const version of versions) {
      const icons = model.faNames[version];
      for (const [name, entry] of faMatches(model, icons).matches) {
        for (const alias of pass === 'names' ? [name] : icons[name][2]) {
          if (pass === 'aliases' && byName.has(alias) && !byName.get(alias).fromAlias) continue;
          const merged = byName.get(alias) ?? (pass === 'aliases' ? { fromAlias: true } : {});
          for (const [style, icon] of Object.entries(entry)) merged[style] ??= icon;
          byName.set(alias, merged);
        }
      }
    }
  }
  for (const entry of byName.values()) delete entry.fromAlias;

  const rules = [];
  for (const name of [...byName.keys()].sort()) {
    const entry = byName.get(name);
    // The plain class carries the solid codepoint, or the only style the name has.
    const base = entry.solid ?? entry.regular ?? entry.brands;
    rules.push(`.fa-${name} {\n  --fa: ${content(base.codepoint)};\n}`);
    for (const style of ['regular', 'brands']) {
      const icon = entry[style];
      if (!icon) continue;
      const declarations = [];
      if (icon.codepoint !== base.codepoint) declarations.push(`--fa: ${content(icon.codepoint)};`);
      // A free regular icon without a regular glyph in Line Awesome shows the solid one.
      if (style === 'regular' && icon.style === 'solid') declarations.push('--fa-style: 900;');
      if (declarations.length) rules.push(`${SELECTOR[style]}.fa-${name} {\n  ${declarations.join('\n  ')}\n}`);
    }
  }
  return rules;
}

export function faShimCss(model, root, { version }) {
  const utilities = readFileSync(join(root, 'scripts/data/fa-utilities.css'), 'utf8')
    .replace("'Font Awesome 7 Free'", "'Line Awesome Free'")
    // FA7 makes every icon 1.25em wide; FA6 sizes it by the glyph and gives 1.25em only to fa-fw.
    // Glyph width keeps FA6 layouts in place; FA7 sites restore theirs with :root { --fa-width: 1.25em }.
    .replace('width: var(--fa-width, 1.25em);', 'width: var(--fa-width, auto);');
  const faVersions = Object.keys(model.faNames).join(' and ');
  const faces = [];
  for (const family of ['Line Awesome', 'Font Awesome 6', 'Font Awesome 7']) {
    faces.push(fontFace(`${family} Free`, 400, 'la-regular-400'));
    faces.push(fontFace(`${family} Free`, 900, 'la-solid-900'));
    faces.push(fontFace(`${family} Brands`, 400, 'la-brands-400'));
  }
  return `/*!
 * Line Awesome ${version} by Icons8 — https://icons8.com/line-awesome
 * Font Awesome 6 and 7 compatibility: swap the Font Awesome stylesheet for this one.
 * Icon names of Font Awesome Free ${faVersions}; utility classes from Font Awesome Free
 * (Code: MIT License, Copyright Fonticons, Inc.).
 */
${faces.join('\n')}
:root, :host {
  --fa-family-classic: 'Line Awesome Free';
  --fa-family-brands: 'Line Awesome Brands';
  --fa-style-family-classic: var(--fa-family-classic);
  --fa-style-family-brands: var(--fa-family-brands);
  --fa-font-solid: normal 900 1em/1 var(--fa-family-classic);
  --fa-font-regular: normal 400 1em/1 var(--fa-family-classic);
  --fa-font-brands: normal 400 1em/1 var(--fa-family-brands);
}

${utilities.trimEnd()}

.fa,
.fas,
.fa-solid,
.fa-classic {
  --fa-family: var(--fa-family-classic);
  --fa-style: 900;
}
.far,
.fa-regular {
  --fa-family: var(--fa-family-classic);
  --fa-style: 400;
}
.fab,
.fa-brands,
.fa-classic.fa-brands {
  --fa-family: var(--fa-family-brands);
  --fa-style: 400;
}

${iconRules(model).join('\n')}
`;
}

// Whitespace and comments only; keeps the `/*!` license header.
export function minifyCss(css) {
  const [, header, body] = /^(\/\*![\s\S]*?\*\/)\s*([\s\S]*)$/.exec(css);
  const min = body
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
  return `${header}${min}\n`;
}
