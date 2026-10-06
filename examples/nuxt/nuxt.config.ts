import IconsResolver from 'unplugin-icons/resolver';
import { ExternalPackageIconLoader } from 'unplugin-icons/loaders';

// The README recipe verbatim, plus the v1 CSS and two settings that keep the build quiet.
export default defineNuxtConfig({
  modules: [
    [
      'unplugin-icons/nuxt',
      { customCollections: ExternalPackageIconLoader('line-awesome') },
    ],
    [
      'unplugin-vue-components/nuxt',
      {
        dts: false,
        resolvers: [
          IconsResolver({
            customCollections: ['line-awesome'],
            alias: { la: 'line-awesome' },
          }),
        ],
      },
    ],
  ],
  // Bundle the package into the server build too, so the server only carries the icons in use.
  build: { transpile: ['line-awesome'] },
  css: ['line-awesome/dist/line-awesome/css/line-awesome.min.css'],
  compatibilityDate: '2026-09-01',
  telemetry: false,
});
