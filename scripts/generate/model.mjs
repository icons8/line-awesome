// The icon set model: icons per style, regular = solid dedup, FA4 aliases, Iconify names.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseCss } from './parse-css.mjs';
import { parseFonts } from './parse-fonts.mjs';
import { toIconData } from './optimize.mjs';

export const PREFIX = { solid: 'las', regular: 'lar', brands: 'lab' };

export function pascal(kebab) {
  return kebab.replace(/(^|-)([a-z0-9])/g, (_, __, char) => char.toUpperCase());
}

export function exportName(style, base) {
  return PREFIX[style] + pascal(base);
}

export function buildModel(root) {
  const { classes, aliases: fa4 } = parseCss(join(root, 'dist/line-awesome/css/line-awesome.css'));
  const fonts = parseFonts(join(root, 'dist/line-awesome/fonts'));
  const svgFiles = new Set(readdirSync(join(root, 'svg')).filter((f) => f.endsWith('.svg')));
  const used = new Set();
  const skipped = [];

  const icons = []; // { id, exportName, base, style, codepoint, file, data, sameAs? }
  const byStyleCodepoint = new Map();

  for (const [base, codepoint] of classes) {
    const styles = ['solid', 'regular', 'brands'].filter((style) => fonts[style].has(codepoint));
    if (!styles.length) {
      skipped.push(`${base}: no glyph in any font`);
      continue;
    }
    for (const style of styles) {
      const file = style === 'solid' ? `${base}-solid.svg` : `${base}.svg`;
      if (!svgFiles.has(file)) throw new Error(`${base} (${style}): missing svg/${file}`);
      if (used.has(file)) throw new Error(`svg/${file} is used twice`);
      used.add(file);
      const id = `${PREFIX[style]}-${base}`;
      const icon = {
        id,
        exportName: exportName(style, base),
        base,
        style,
        codepoint,
        file,
        data: toIconData(id, readFileSync(join(root, 'svg', file), 'utf8')),
      };
      icons.push(icon);
      byStyleCodepoint.set(`${style}:${codepoint}`, icon);
    }
  }

  const unused = [...svgFiles].filter((file) => !used.has(file));
  if (unused.length) throw new Error(`svg files without a CSS class: ${unused.join(', ')}`);

  // A regular icon identical to its solid twin after optimization re-exports the solid one.
  for (const icon of icons) {
    if (icon.style !== 'regular') continue;
    const solid = byStyleCodepoint.get(`solid:${icon.codepoint}`);
    if (solid && solid.data.body === icon.data.body) icon.sameAs = solid;
  }

  const canonical = new Map(icons.map((icon) => [icon.exportName, icon]));
  const aliases = []; // { id, exportName, fa4, target }
  for (const alias of fa4) {
    const target = byStyleCodepoint.get(`${alias.style}:${alias.codepoint}`);
    if (!target) {
      skipped.push(`FA4 ${alias.name}: no ${alias.style} icon for \\${alias.codepoint}`);
      continue;
    }
    const name = exportName(alias.style, alias.name);
    if (canonical.has(name)) continue; // `.la.la-meetup` only switches the font — the name already exists
    aliases.push({ id: `${PREFIX[alias.style]}-${alias.name}`, exportName: name, fa4: alias.name, target });
  }

  const model = { icons, aliases, skipped };
  model.faNames = JSON.parse(readFileSync(join(root, 'scripts/data/fa-names.json'), 'utf8'));
  model.faAliases = faAliases(model, model.faNames);
  return model;
}

const FA_STYLE = { s: 'solid', r: 'regular', b: 'brands' };

// Font Awesome 6/7 icon → Line Awesome icon of the same style. The codepoint decides first:
// FA keeps it when an icon is renamed, while a reused name can change meaning (`hands`,
// `transgender` in FA6 are not the FA5 icons). Then the name and its old names, including the
// FA4 names of the v1 CSS. A free regular icon without a regular twin falls back to solid.
export function faMatches(model, faIcons) {
  const byCodepoint = new Map(model.icons.map((icon) => [`${icon.style}:${icon.codepoint}`, icon]));
  const byName = new Map(model.icons.map((icon) => [`${icon.style}:${icon.base}`, icon]));
  for (const alias of model.aliases) byName.set(`${alias.target.style}:${alias.fa4}`, alias.target);

  const find = (style, codepoint, names) =>
    byCodepoint.get(`${style}:${codepoint}`) ?? names.map((name) => byName.get(`${style}:${name}`)).find(Boolean);

  const matches = new Map(); // name → { solid?, regular?, brands? }
  let pairs = 0;
  let matched = 0;
  for (const [name, [codepoint, styles, oldNames]] of Object.entries(faIcons)) {
    const names = [name, ...oldNames];
    const entry = {};
    for (const code of styles) {
      const style = FA_STYLE[code];
      pairs++;
      const icon = find(style, codepoint, names) ?? (style === 'regular' ? find('solid', codepoint, names) : undefined);
      if (!icon) continue;
      entry[style] = icon;
      matched++;
    }
    if (Object.keys(entry).length) matches.set(name, entry);
  }
  return { matches, pairs, matched };
}

// FA6/7 names that Line Awesome lacks become re-exports of the matched icon (`lasHouse` → `lasHome`).
// A name Line Awesome already has keeps its Line Awesome meaning. FA7 wins over FA6 on a conflict.
export function faAliases(model, faNames) {
  const taken = new Set([...model.icons, ...model.aliases].map((item) => item.exportName));
  const result = new Map(); // exportName → { id, exportName, fa, target, versions }
  for (const version of Object.keys(faNames).sort(compareVersions).reverse()) {
    for (const [name, entry] of faMatches(model, faNames[version]).matches) {
      for (const target of Object.values(entry)) {
        const aliasName = exportName(target.style, name);
        if (taken.has(aliasName)) continue;
        const existing = result.get(aliasName);
        if (existing) {
          existing.versions.push(version);
          continue;
        }
        result.set(aliasName, { id: `${PREFIX[target.style]}-${name}`, exportName: aliasName, fa: name, target, versions: [version] });
      }
    }
  }
  return [...result.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
}

// Names as in @iconify-json/la: regular and brands unsuffixed, solid with `-solid`;
// solid-only icons are canonical without the suffix, with `-solid` as an alias.
export function iconifyNames(model) {
  const regularCodepoints = new Set(model.icons.filter((i) => i.style === 'regular').map((i) => i.codepoint));
  const icons = new Map();
  const aliases = new Map();
  for (const icon of model.icons) {
    if (icon.style !== 'solid') icons.set(icon.base, icon);
    else if (regularCodepoints.has(icon.codepoint)) icons.set(`${icon.base}-solid`, icon);
    else {
      icons.set(icon.base, icon);
      aliases.set(`${icon.base}-solid`, icon.base);
    }
  }
  const nameOf = new Map([...icons].map(([name, icon]) => [icon, name]));
  for (const alias of model.aliases) {
    if (!icons.has(alias.fa4) && !aliases.has(alias.fa4)) aliases.set(alias.fa4, nameOf.get(alias.target));
  }
  for (const alias of model.faAliases ?? []) {
    const { target } = alias;
    const name = target.style === 'solid' && regularCodepoints.has(target.codepoint) ? `${alias.fa}-solid` : alias.fa;
    if (!icons.has(name) && !aliases.has(name)) aliases.set(name, nameOf.get(target));
  }
  return { icons, aliases };
}
