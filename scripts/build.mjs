// Builds lib/: core and components via tsc, then icons from svg/; and the FA6/7 shim in dist/.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildModel } from './generate/model.mjs';
import { emit } from './generate/emit.mjs';
import { FA_SHIM_DIR, faShimCss, minifyCss } from './generate/fa-shim.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const lib = join(root, 'lib');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

rmSync(lib, { recursive: true, force: true });
execFileSync(join(root, 'node_modules/.bin/tsc'), ['-p', join(root, 'tsconfig.json')], { stdio: 'inherit' });

const model = buildModel(root);
emit(model, lib, { version });
const shimDir = join(root, FA_SHIM_DIR, 'css');
const shim = faShimCss(model, root, { version });
mkdirSync(shimDir, { recursive: true });
writeFileSync(join(shimDir, 'all.css'), shim);
writeFileSync(join(shimDir, 'all.min.css'), minifyCss(shim));

for (const note of model.skipped) console.log(`skipped: ${note}`);
console.log(`lib/: ${model.icons.length} icons, ${model.aliases.length} FA4 aliases, ${model.faAliases.length} FA6/7 aliases`);
