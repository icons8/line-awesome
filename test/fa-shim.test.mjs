import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { buildModel, faMatches } from '../scripts/generate/model.mjs';
import { FA_SHIM_DIR, faShimCss, minifyCss } from '../scripts/generate/fa-shim.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const model = buildModel(root);
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const shim = readFileSync(join(root, FA_SHIM_DIR, 'css/all.css'), 'utf8');

// Share of free FA "name + style" pairs that show a Line Awesome icon. Floors from IT-583.
test.each([
  ['6.7.2', 2060, 0.757],
  ['7.3.1', 2163, 0.721],
])('FA %s: at least the planned share of free icons is covered', (faVersion, pairs, floor) => {
  const result = faMatches(model, model.faNames[faVersion]);
  expect(result.pairs).toBe(pairs);
  expect(result.matched / result.pairs).toBeGreaterThanOrEqual(floor);
});

test('the shim in dist/ is what the generator writes (run npm run build after changing it)', () => {
  expect(shim).toBe(faShimCss(model, root, { version }));
  expect(readFileSync(join(root, FA_SHIM_DIR, 'css/all.min.css'), 'utf8')).toBe(minifyCss(shim));
});

const rule = (selector) => {
  const at = shim.indexOf(`\n${selector} {`);
  return at === -1 ? null : shim.slice(at + 1, shim.indexOf('}', at) + 1);
};

test('FA6/7 names resolve by codepoint first: renamed icons keep their FA meaning', () => {
  expect(rule('.fa-house')).toContain('--fa: "\\f015"'); // la-home
  expect(rule('.fa-hands')).toContain('--fa: "\\f2a7"'); // FA6 hands = sign language, not FA5 hands
  expect(rule('.fa-hands-holding')).toContain('--fa: "\\f4c2"');
  expect(rule('.fa-github')).toContain('--fa: "\\f09b"');
});

test('icons are as wide as their glyph, as in Font Awesome 6; fa-fw makes them 1.25em', () => {
  expect(shim).toContain('width: var(--fa-width, auto);');
  expect(shim).not.toContain('width: var(--fa-width, 1.25em)');
  expect(shim).toMatch(/\.fa-fw,\n\.fa-width-fixed \{\n {2}--fa-width: 1\.25em;/);
});

test('a free regular icon without a Line Awesome regular glyph falls back to solid', () => {
  expect(shim).toMatch(/:is\(\.far, \.fa-regular\)\.fa-[a-z0-9-]+ \{\n {2}--fa-style: 900;/);
});

test('prefixes, families and fonts', () => {
  for (const family of ['Line Awesome', 'Font Awesome 6', 'Font Awesome 7']) {
    expect(shim).toContain(`font-family: "${family} Free";`);
    expect(shim).toContain(`font-family: "${family} Brands";`);
  }
  expect(shim).not.toMatch(/font-display: (?!block)/);
  expect(shim).toContain('url("../../line-awesome/fonts/la-solid-900.woff2")');
  for (const prefix of ['.fas', '.far', '.fab', '.fa-solid', '.fa-regular', '.fa-brands']) expect(shim).toContain(prefix);
  expect(shim).toContain('content: var(--fa)');
  for (const utility of ['.fa-fw', '.fa-spin', '.fa-rotate-90', '.fa-flip-horizontal', '.fa-stack', '.fa-ul', '.fa-li', '.fa-border', '.fa-pull-left', '.sr-only', '.fa-xs', '.fa-10x']) {
    expect(shim, utility).toContain(utility);
  }
});
