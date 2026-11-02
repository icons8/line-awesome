// Writes scripts/data/fa-names.json: the free classic icons of the pinned Font Awesome versions
// (name → codepoint, styles, old names), read from the metadata of @fortawesome/fontawesome-free,
// and scripts/data/fa-utilities.css: the utility classes of the newest one (sizes, fixed width,
// lists, animations, rotation, stacking, screen-reader text) without its icon rules.
// The FA6/7 shim and the FA6/7 names of the modules are generated from these files.
//
//   npm pack @fortawesome/fontawesome-free@7.3.1 && tar xzf fortawesome-fontawesome-free-7.3.1.tgz -C fa7
//   node scripts/fa-names.mjs fa6/package fa7/package
import { readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
export const faNamesPath = join(root, 'scripts/data/fa-names.json');
export const faUtilitiesPath = join(root, 'scripts/data/fa-utilities.css');
const STYLE = { solid: 's', regular: 'r', brands: 'b' };

export function readFaNames() {
  return JSON.parse(readFileSync(faNamesPath, 'utf8'));
}

function extract(pkg) {
  const { version } = JSON.parse(readFileSync(join(pkg, 'package.json'), 'utf8'));
  const families = JSON.parse(readFileSync(join(pkg, 'metadata/icon-families.json'), 'utf8'));
  const icons = {};
  for (const name of Object.keys(families).sort()) {
    const icon = families[name];
    const styles = (icon.familyStylesByLicense?.free ?? [])
      .filter((entry) => entry.family === 'classic' && STYLE[entry.style])
      .map((entry) => STYLE[entry.style])
      .sort()
      .join('');
    if (!styles) continue;
    icons[name] = [icon.unicode, styles, icon.aliases?.names ?? []];
  }
  return [version, icons];
}

// Font Awesome's core CSS up to the first icon rule, from the newest version, plus the
// `sr-only` classes, which FA7 dropped and FA6 sites still use.
function utilities(packages) {
  const css = readFileSync(join(packages.at(-1), 'css/fontawesome.css'), 'utf8');
  const core = css
    .slice(0, css.search(/^\.fa-0 \{/m))
    .replace(/\/\* Font Awesome uses the Unicode Private Use Area[\s\S]*?\*\/\s*$/, '')
    .trimEnd();
  const srOnly = packages
    .map((pkg) => readFileSync(join(pkg, 'css/all.css'), 'utf8'))
    .map((all) => [/^\.sr-only,[\s\S]*?\}\n/m, /^\.sr-only-focusable[\s\S]*?\}\n/m].map((re) => all.match(re)?.[0]))
    .find((rules) => rules.every(Boolean));
  if (!srOnly) throw new Error('no sr-only rules in the given packages');
  return `${core}\n\n${srOnly.join('\n')}`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const packages = process.argv.slice(2);
  if (!packages.length) throw new Error('usage: node scripts/fa-names.mjs <unpacked fontawesome-free>…');
  const table = Object.fromEntries(packages.map(extract));
  writeFileSync(faNamesPath, JSON.stringify(table) + '\n');
  writeFileSync(faUtilitiesPath, utilities(packages));
  for (const [version, icons] of Object.entries(table)) {
    console.log(`FA ${version}: ${Object.keys(icons).length} free icons`);
  }
  console.log(`wrote ${relative(root, faNamesPath)} and ${relative(root, faUtilitiesPath)}`);
}
