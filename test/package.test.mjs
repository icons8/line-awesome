// Checks the tarball npm would publish: contents, exports targets, legacy bytes, size.
import { afterAll, beforeAll, expect, test } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareLegacy } from '../scripts/legacy-hashes.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
let work, pkg, packed;

beforeAll(() => {
  work = mkdtempSync(join(tmpdir(), 'line-awesome-pack-'));
  [packed] = JSON.parse(execFileSync('npm', ['pack', '--json', '--pack-destination', work], { cwd: root, encoding: 'utf8' }));
  execFileSync('tar', ['xzf', join(work, packed.filename), '-C', work]);
  pkg = join(work, 'package');
});

afterAll(() => rmSync(work, { recursive: true, force: true }));

test('tarball holds dist, svg and lib only', () => {
  const tops = new Set(packed.files.map((file) => file.path.split('/')[0]));
  expect([...tops].sort()).toEqual(['CHANGELOG.md', 'LICENSE.md', 'README.md', 'dist', 'lib', 'package.json', 'svg']);
});

test('legacy files inside the tarball match line-awesome@1.3.0', () => {
  const { missing, changed, added } = compareLegacy(pkg);
  expect({ missing, changed, added }).toEqual({ missing: [], changed: [], added: [] });
});

test('every exports target exists in the tarball', () => {
  const targets = [];
  const collect = (value) => (typeof value === 'string' ? targets.push(value) : Object.values(value).forEach(collect));
  for (const [key, value] of Object.entries(manifest.exports)) if (key !== './*') collect(value);
  for (const target of [...targets, manifest.main, manifest.style]) {
    expect(existsSync(join(pkg, target.replace('./', '').replace('*', 'las-star'))), target).toBe(true);
  }
});

// Sass asks for both `sass` and `style` and takes the first key that matches. With `style`
// first, `@use 'pkg:line-awesome'` would load the minified CSS, whose font URLs nothing resolves.
test('the sass condition comes before style', () => {
  const conditions = Object.keys(manifest.exports['.']);
  expect(conditions.indexOf('sass')).toBeLessThan(conditions.indexOf('style'));
});

test('installing runs no scripts and pulls no dependencies', () => {
  expect(manifest.dependencies).toBeUndefined();
  for (const hook of ['preinstall', 'install', 'postinstall', 'prepare']) expect(manifest.scripts).not.toHaveProperty(hook);
});

test('tarball stays within its size budget', () => {
  expect(packed.size).toBeLessThan(5 * 1024 * 1024);
  expect(packed.unpackedSize).toBeLessThan(13 * 1024 * 1024);
  expect(packed.entryCount).toBeLessThan(5500);
});
