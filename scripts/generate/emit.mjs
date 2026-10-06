// Writes the model to lib/: a module and .d.ts per icon, the barrel, icons.json, metadata.json.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { iconifyNames } from './model.mjs';

const TYPE_IMPORT = "import type { IconData } from '../core.js';\n";

function iconModule(icon) {
  if (icon.sameAs) {
    const from = icon.sameAs;
    const line = `export { ${from.exportName} as ${icon.exportName}, ${from.exportName} as default } from './${from.id}.js';\n`;
    return { js: line, dts: line };
  }
  return {
    js: `export const ${icon.exportName} = ${JSON.stringify(icon.data)};\nexport default ${icon.exportName};\n`,
    dts: `${TYPE_IMPORT}export declare const ${icon.exportName}: IconData;\nexport default ${icon.exportName};\n`,
  };
}

function aliasModule(alias) {
  const target = alias.target.exportName;
  return {
    js: `export { ${target} as ${alias.exportName}, ${target} as default } from './${alias.target.id}.js';\n`,
    // TS doesn't surface @deprecated on a re-export specifier, hence a separate declaration.
    dts:
      TYPE_IMPORT +
      `/** @deprecated Font Awesome 4 name (\`la-${alias.fa4}\`). Use {@link ${target}} instead. */\n` +
      `export declare const ${alias.exportName}: IconData;\nexport default ${alias.exportName};\n`,
  };
}

function iconsJson(model, version) {
  const { icons, aliases } = iconifyNames(model);
  return {
    prefix: 'la',
    info: {
      name: 'Line Awesome',
      total: icons.size,
      version,
      author: { name: 'Icons8', url: 'https://github.com/icons8/line-awesome' },
      license: { title: 'MIT', spdx: 'MIT', url: 'https://github.com/icons8/line-awesome/blob/master/LICENSE.md' },
      height: 32,
      category: 'General',
      palette: false,
    },
    icons: Object.fromEntries([...icons].map(([name, icon]) => [name, { body: icon.data.body }])),
    aliases: Object.fromEntries([...aliases].map(([name, parent]) => [name, { parent }])),
    width: 32,
    height: 32,
  };
}

function metadata(model) {
  const byBase = new Map();
  for (const icon of model.icons) {
    const entry = byBase.get(icon.base) ?? { name: icon.base, codepoint: icon.codepoint, exports: {}, fa4: [] };
    entry.exports[icon.style] = icon.exportName;
    byBase.set(icon.base, entry);
  }
  for (const alias of model.aliases) byBase.get(alias.target.base).fa4.push(alias.fa4);
  return [...byBase.values()];
}

export function emit(model, outDir, { version }) {
  const iconsDir = join(outDir, 'icons');
  mkdirSync(iconsDir, { recursive: true });

  const indexJs = [];
  const indexDts = ["export type { IconData } from './core.js';"];
  for (const [item, module] of [
    ...model.icons.map((icon) => [icon, iconModule(icon)]),
    ...model.aliases.map((alias) => [alias, aliasModule(alias)]),
  ]) {
    writeFileSync(join(iconsDir, `${item.id}.js`), module.js);
    writeFileSync(join(iconsDir, `${item.id}.d.ts`), module.dts);
    const line = `export { ${item.exportName} } from './icons/${item.id}.js';`;
    indexJs.push(line);
    indexDts.push(line);
  }
  writeFileSync(join(outDir, 'index.js'), indexJs.join('\n') + '\n');
  writeFileSync(join(outDir, 'index.d.ts'), indexDts.join('\n') + '\n');
  writeFileSync(join(outDir, 'icons.json'), JSON.stringify(iconsJson(model, version)));
  writeFileSync(join(outDir, 'metadata.json'), JSON.stringify(metadata(model)));
}
