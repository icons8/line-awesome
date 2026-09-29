import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.mjs'],
    // The visual test renders all 1544 icons twice; the package test runs `npm pack`.
    testTimeout: 60_000,
    // beforeAll in the package test packs and unpacks ~5200 files, which is slow on a busy machine.
    hookTimeout: 60_000,
    typecheck: {
      enabled: true,
      include: ['test/**/*.test-d.ts'],
      tsconfig: 'test/types/tsconfig.json',
    },
  },
});
