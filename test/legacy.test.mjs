// v1 consumers load CSS and fonts from unversioned CDN URLs, which will serve 2.0.0.
// These files must stay byte-identical to line-awesome@1.3.0.
import { expect, test } from 'vitest';
import { fileURLToPath } from 'node:url';
import { compareLegacy } from '../scripts/legacy-hashes.mjs';

test('legacy css, fonts, FA shim and svg match line-awesome@1.3.0 byte for byte', () => {
  const { total, missing, changed, added } = compareLegacy(fileURLToPath(new URL('..', import.meta.url)));
  expect(total).toBe(1578);
  expect({ missing, changed, added }).toEqual({ missing: [], changed: [], added: [] });
});
