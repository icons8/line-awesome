// Each entry is a separate build, so no chunk is shared and each size stands on its own.
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import Icons from 'unplugin-icons/rollup';
import { ExternalPackageIconLoader } from 'unplugin-icons/loaders';

const entry = (name) => ({
  input: `src/${name}.js`,
  output: { file: `dist/${name}.js`, format: 'es' },
  plugins: [
    resolve(),
    Icons({ compiler: 'raw', customCollections: ExternalPackageIconLoader('line-awesome') }),
    terser(),
  ],
});

export default ['one', 'ten', 'all', 'unplugin'].map(entry);
