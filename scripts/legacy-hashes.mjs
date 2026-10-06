// Hashes of v1 files that must stay byte-identical to line-awesome@1.3.0:
// CSS, fonts, the FA shim and svg/. Unversioned CDN URLs point at them.
// SCSS is excluded: 2.0.0 ships the 1.3.1 fixes.
//
//   node scripts/legacy-hashes.mjs --write <root>   write the fixture from an unpacked 1.3.0 tarball
//   node scripts/legacy-hashes.mjs [root]           check root (defaults to the repository)
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
export const fixturePath = join(repoRoot, 'test/fixtures/legacy-1.3.0.sha256.json');

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function isLegacy(path) {
  return !path.startsWith('dist/line-awesome/scss/');
}

export function hashLegacy(root) {
  const files = [...walk(join(root, 'dist')), ...walk(join(root, 'svg'))]
    .map((path) => relative(root, path).split(sep).join('/'))
    .filter(isLegacy)
    .sort();
  return Object.fromEntries(
    files.map((file) => [file, createHash('sha256').update(readFileSync(join(root, file))).digest('hex')]),
  );
}

export function compareLegacy(root) {
  const expected = JSON.parse(readFileSync(fixturePath, 'utf8'));
  const actual = hashLegacy(root);
  const missing = Object.keys(expected).filter((file) => !(file in actual));
  const changed = Object.keys(expected).filter((file) => file in actual && actual[file] !== expected[file]);
  const added = Object.keys(actual).filter((file) => !(file in expected));
  return { total: Object.keys(expected).length, missing, changed, added };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args[0] === '--write') {
    const hashes = hashLegacy(args[1]);
    writeFileSync(fixturePath, JSON.stringify(hashes, null, 2) + '\n');
    console.log(`wrote ${Object.keys(hashes).length} hashes to ${relative(repoRoot, fixturePath)}`);
  } else {
    const { total, missing, changed, added } = compareLegacy(args[0] ?? repoRoot);
    for (const file of missing) console.log(`missing: ${file}`);
    for (const file of changed) console.log(`changed: ${file}`);
    for (const file of added) console.log(`unexpected file in legacy paths: ${file}`);
    const ok = !missing.length && !changed.length && !added.length;
    console.log(ok ? `legacy files match 1.3.0: ${total} files` : 'legacy files differ from 1.3.0');
    process.exitCode = ok ? 0 : 1;
  }
}
