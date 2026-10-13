// Parses the v1 CSS: icon classes with codepoints and the FA4 `.la.la-*` section.
import { readFileSync } from 'node:fs';

const RULE = /([^{}]+)\{([^{}]*)\}/g;

function declarations(body) {
  const result = {};
  for (const part of body.split(';')) {
    const colon = part.indexOf(':');
    if (colon === -1) continue;
    result[part.slice(0, colon).trim()] = part.slice(colon + 1).trim();
  }
  return result;
}

function codepointOf(content) {
  const match = /^"\\([0-9a-f]+)"$/i.exec(content ?? '');
  return match ? match[1].toLowerCase() : null;
}

// FA4 alias style follows the font its rule sets. No rule means `.la`'s default, solid.
function styleOf(decl) {
  const family = decl['font-family'] ?? '';
  if (family.includes('Brands')) return 'brands';
  if (decl['font-weight'] === '400') return 'regular';
  return 'solid';
}

export function parseCss(path) {
  const css = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const classes = new Map(); // base name → codepoint
  const fa4 = new Map(); // fa4 name → { codepoint?, style? }

  for (const [, selectorText, body] of css.matchAll(RULE)) {
    const decl = declarations(body);
    for (const selector of selectorText.split(',').map((s) => s.trim())) {
      let match;
      if ((match = /^\.la-([a-z0-9-]+):before$/.exec(selector))) {
        const codepoint = codepointOf(decl.content);
        if (codepoint) classes.set(match[1], codepoint);
      } else if ((match = /^\.la\.la-([a-z0-9-]+)(:before)?$/.exec(selector))) {
        const entry = fa4.get(match[1]) ?? {};
        if (match[2]) entry.codepoint = codepointOf(decl.content);
        else entry.style = styleOf(decl);
        fa4.set(match[1], entry);
      }
    }
  }

  // `.la.la-pull-left/right` are float utilities, not icons: they have no codepoint.
  const aliases = [...fa4]
    .map(([name, entry]) => ({
      name,
      codepoint: entry.codepoint ?? classes.get(name) ?? null,
      style: entry.style ?? 'solid',
    }))
    .filter((alias) => alias.codepoint);
  return { classes, aliases };
}
