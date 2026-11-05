// Browser test of all icons: `npm run test:visual`. Kept out of `npm test`: it needs a browser
// (`npx playwright install chromium`) and renders the whole icon page twice.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test-visual/**/*.visual.mjs'],
    testTimeout: 300_000,
    hookTimeout: 120_000,
    fileParallelism: false,
    reporters: ['verbose'],
  },
});
