import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { globals: true, environment: 'node' },
  resolve: {
    alias: {
      '@spwnr/core-types': new URL('../core-types/src/index.ts', import.meta.url).pathname,
    },
  },
});
