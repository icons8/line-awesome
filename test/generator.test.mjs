import { expect, test } from 'vitest';
import { fileURLToPath } from 'node:url';
import { buildModel } from '../scripts/generate/model.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const model = buildModel(root);

test('every svg file becomes exactly one icon, styles taken from the fonts', () => {
  const count = (style) => model.icons.filter((icon) => icon.style === style).length;
  expect(model.icons).toHaveLength(1544);
  expect(count('solid')).toBe(960);
  expect(count('regular')).toBe(151);
  expect(count('brands')).toBe(433);
  expect(model.skipped).toEqual(['font-awesome-logo-full: no glyph in any font']);
});

test('regular icons identical to solid re-export them; the 9 that differ keep their own data', () => {
  const regular = model.icons.filter((icon) => icon.style === 'regular');
  expect(regular.filter((icon) => icon.sameAs)).toHaveLength(142);
  expect(regular.filter((icon) => !icon.sameAs).map((icon) => icon.base).sort()).toEqual([
    'chart-bar',
    'check-square',
    'circle',
    'clipboard',
    'clone',
    'eye-slash',
    'heart',
    'square',
    'star',
  ]);
});

test('FA4 aliases point at an existing icon of the style the v1 CSS selects', () => {
  expect(model.aliases).toHaveLength(266);
  const byName = new Map(model.aliases.map((alias) => [alias.fa4, alias]));
  expect(byName.get('star-o')).toMatchObject({ exportName: 'larStarO', target: { exportName: 'larStar' } });
  expect(byName.get('close').target.exportName).toBe('lasTimes');
  expect(byName.get('glass').target.exportName).toBe('lasGlassMartini');
  const prefix = { solid: 'las', regular: 'lar', brands: 'lab' };
  for (const alias of model.aliases) expect(alias.exportName.startsWith(prefix[alias.target.style])).toBe(true);
});

test('export names and module ids are unique; ids are lowercase kebab-case', () => {
  const items = [...model.icons, ...model.aliases];
  expect(new Set(items.map((item) => item.exportName)).size).toBe(items.length);
  expect(new Set(items.map((item) => item.id.toLowerCase())).size).toBe(items.length);
  for (const item of items) {
    expect(item.id).toMatch(/^la[srb]-[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(item.exportName).toMatch(/^la[srb][A-Za-z0-9]+$/);
  }
});

test('monochrome bodies are painted only with currentColor', () => {
  for (const { data } of model.icons) {
    expect(data).toMatchObject({ mono: true, width: 32, height: 32 });
    expect(data.body).not.toMatch(/<svg|<\?xml|xmlns|style=/);
    for (const [, value] of data.body.matchAll(/(?:fill|stroke)="([^"]*)"/g)) {
      expect(['currentColor', 'none'], data.name).toContain(value);
    }
  }
});

test('fill-rule survives optimization', () => {
  const github = model.icons.find((icon) => icon.id === 'lab-github');
  expect(github.data.body).toMatch(/fill-rule="evenodd"/);
});
