// lib/icons.json lets unplugin-icons, UnoCSS and Tailwind use the set directly.
// Its names must cover @iconify-json/la, so switching collections breaks nobody.
import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readAdditions } from '../scripts/additions.mjs';

const json = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const set = json('../lib/icons.json');
const iconify = json('./fixtures/iconify-la-names.json');
const total = 1544 + readAdditions(fileURLToPath(new URL('..', import.meta.url))).length;

test('icons.json is a valid IconifyJSON set', () => {
  expect(set).toMatchObject({ prefix: 'la', width: 32, height: 32, info: { total, license: { spdx: 'MIT' } } });
  expect(Object.keys(set.icons)).toHaveLength(total);
  for (const [name, icon] of Object.entries(set.icons)) {
    expect(name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(icon.body).toBeTypeOf('string');
  }
  for (const [name, alias] of Object.entries(set.aliases)) expect(set.icons, name).toHaveProperty([alias.parent]);
});

test('every name from @iconify-json/la resolves', () => {
  const ours = new Set([...Object.keys(set.icons), ...Object.keys(set.aliases)]);
  expect(iconify.names.filter((name) => !ours.has(name))).toEqual([]);
});
