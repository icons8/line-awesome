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

  return { icons, aliases, skipped };
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
  return { icons, aliases };
}
