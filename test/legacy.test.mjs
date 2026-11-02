// v1 consumers load CSS and fonts from unversioned CDN URLs, which will serve 2.0.0.
// These files must stay byte-identical to line-awesome@1.3.0, except `font-display: block` in CSS (2.0.2).
import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareLegacy } from '../scripts/legacy-hashes.mjs';

test('legacy css, fonts, FA shim and svg match line-awesome@1.3.0 byte for byte', () => {
  const { total, missing, changed, added } = compareLegacy(fileURLToPath(new URL('..', import.meta.url)));
  expect(total).toBe(1578);
  expect({ missing, changed, added }).toEqual({ missing: [], changed: [], added: [] });
});

test('every @font-face in the CSS uses font-display: block (#72)', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  for (const file of [
    'dist/line-awesome/css/line-awesome.css',
    'dist/line-awesome/css/line-awesome.min.css',
    'dist/font-awesome-line-awesome/css/all.css',
    'dist/font-awesome-line-awesome/css/all.min.css',
  ]) {
    const css = readFileSync(join(root, file), 'utf8');
    expect(css.match(/font-display: ?block/g), file).toHaveLength(3);
    expect(css, file).not.toMatch(/font-display: ?auto/);
  }
});

test('$la-version in SCSS is the package version without a prerelease suffix', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const scss = readFileSync(join(root, 'dist/line-awesome/scss/_variables.scss'), 'utf8');
  expect(scss).toContain(`$la-version: ${version.replace(/-.*/, '')} !default;`);
});
