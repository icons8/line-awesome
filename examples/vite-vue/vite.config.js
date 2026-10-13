import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import Icons from 'unplugin-icons/vite';
import IconsResolver from 'unplugin-icons/resolver';
import { ExternalPackageIconLoader } from 'unplugin-icons/loaders';
import Components from 'unplugin-vue-components/vite';
import { NodePackageImporter } from 'sass';

export default defineConfig({
  plugins: [
    vue(),
    // <i-la-heart-solid /> in a template is imported automatically, only when used.
    Components({
      dts: false,
      resolvers: [IconsResolver({ customCollections: ['line-awesome'], alias: { la: 'line-awesome' } })],
    }),
    Icons({ compiler: 'vue3', customCollections: ExternalPackageIconLoader('line-awesome') }),
  ],
  // v1 SCSS through the package's `sass` export condition: @use 'pkg:line-awesome'.
  css: {
    preprocessorOptions: {
      scss: {
        importers: [new NodePackageImporter()],
        // The v1 SCSS predates the Sass module system.
        silenceDeprecations: ['import', 'global-builtin'],
      },
    },
  },
});
