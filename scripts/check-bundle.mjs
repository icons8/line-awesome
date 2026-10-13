// Checks an example's build output against its expected.json: exactly the imported icons
// end up in each bundle, and sizes stay within budget. Icons are recognised by their path
// data, since minifiers drop unused fields such as `name`.
//
//   node scripts/check-bundle.mjs examples/<name>
//
// expected.json: { "<file | dir/*.ext>": { icons?: [ids], iconify?: [names], allIcons?: true,
//                  contains?: [strings], maxGzip?: bytes, minFiles?: count } }
// minFiles only counts matching files, e.g. to prove that the v1 fonts were copied into the build.
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

const example = resolve(process.argv[2] ?? '.');
const pkg = join(example, 'node_modules/line-awesome/lib');
const expected = JSON.parse(readFileSync(join(example, 'expected.json'), 'utf8'));

// Icons with the same artwork (regular re-exporting solid, `btc` = `bitcoin`) are
// indistinguishable in a bundle and form one group.
const pathsOf = (body) => [...body.matchAll(/\bd="([^"]+)"/g)].map((match) => match[1]);
const keyOf = (body) => JSON.stringify(pathsOf(body));
const groups = new Map(); // key → { paths, name, ids }
for (const icon of Object.values(await import(pathToFileURL(join(pkg, 'index.js')).href))) {
  const key = keyOf(icon.body);
  const group = groups.get(key) ?? { paths: pathsOf(icon.body), name: icon.name, ids: new Set() };
  group.ids.add(icon.name);
  groups.set(key, group);
}
const byId = new Map([...groups.values()].flatMap((group) => [...group.ids].map((id) => [id, group])));
const iconify = JSON.parse(readFileSync(join(pkg, 'icons.json'), 'utf8'));
const iconifyGroup = (name) => {
  const body = (iconify.icons[name] ?? iconify.icons[iconify.aliases[name]?.parent])?.body;
  return body && groups.get(keyOf(body));
};

function matchingFiles(pattern) {
  const star = pattern.lastIndexOf('*');
  const dir = join(example, pattern.slice(0, pattern.lastIndexOf('/', star)));
  const ext = pattern.slice(star + 1);
  return readdirSync(dir).filter((file) => file.endsWith(ext)).map((file) => join(dir, file));
}

function readOutput(pattern) {
  const star = pattern.lastIndexOf('*');
  if (star === -1) return readFileSync(join(example, pattern), 'utf8');
  return matchingFiles(pattern)
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');
}

const failures = [];
const sizes = {};
for (const [pattern, spec] of Object.entries(expected)) {
  if (spec.minFiles) {
    const count = matchingFiles(pattern).length;
    if (count < spec.minFiles) failures.push(`${pattern}: ${count} files, expected at least ${spec.minFiles}`);
    console.log(`${pattern.padEnd(28)} ${String(count).padStart(9)} files`);
    continue;
  }
  const code = readOutput(pattern);
  const gzip = gzipSync(code).length;
  sizes[pattern] = gzip;
  const found = [...groups.values()].filter((group) => group.paths.every((d) => code.includes(d)));

  if (spec.allIcons) {
    if (found.length !== groups.size) failures.push(`${pattern}: ${found.length} of ${groups.size} icons`);
  } else {
    const want = new Set([...(spec.icons ?? []).map((id) => byId.get(id)), ...(spec.iconify ?? []).map(iconifyGroup)]);
    if (want.has(undefined)) failures.push(`${pattern}: expected.json names an unknown icon`);
    const extra = found.filter((group) => !want.has(group)).map((group) => group.name);
    const missing = [...want].filter((group) => group && !found.includes(group)).map((group) => group.name);
    if (extra.length) failures.push(`${pattern}: unexpected icons ${extra.join(', ')}`);
    if (missing.length) failures.push(`${pattern}: missing icons ${missing.join(', ')}`);
  }
  for (const text of spec.contains ?? []) if (!code.includes(text)) failures.push(`${pattern}: no "${text}"`);
  if (spec.maxGzip && gzip > spec.maxGzip) failures.push(`${pattern}: ${gzip} B gzip > budget ${spec.maxGzip} B`);
  console.log(`${pattern.padEnd(28)} ${String(code.length).padStart(9)} B  ${String(gzip).padStart(7)} B gzip  ${found.length} icons`);
}

// The cost of an icon must not depend on the set size: nine more icons, nine icons' worth of bytes.
if (sizes['dist/one.js'] && sizes['dist/ten.js']) {
  const delta = sizes['dist/ten.js'] - sizes['dist/one.js'];
  console.log(`1 → 10 icons: +${delta} B gzip`);
  if (delta > 9 * 1536) failures.push(`1 → 10 icons grew by ${delta} B gzip`);
}

for (const failure of failures) console.error(`✖ ${failure}`);
process.exitCode = failures.length ? 1 : 0;
