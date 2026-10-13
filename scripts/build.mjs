// Builds lib/: core and components via tsc, then icons from svg/.
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildModel } from './generate/model.mjs';
import { emit } from './generate/emit.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const lib = join(root, 'lib');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

rmSync(lib, { recursive: true, force: true });
execFileSync(join(root, 'node_modules/.bin/tsc'), ['-p', join(root, 'tsconfig.json')], { stdio: 'inherit' });

const model = buildModel(root);
emit(model, lib, { version });
for (const note of model.skipped) console.log(`skipped: ${note}`);
console.log(`lib/: ${model.icons.length} icons, ${model.aliases.length} FA4 aliases`);
