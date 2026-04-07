import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { globals: true, environment: 'node' },
  resolve: {
    alias: {
      '@orchex/core-types': new URL('../core-types/src/index.ts', import.meta.url).pathname,
      '@orchex/broker': new URL('../broker/src/index.ts', import.meta.url).pathname,
      '@orchex/policy': new URL('../policy/src/index.ts', import.meta.url).pathname,
    },
  },
});
