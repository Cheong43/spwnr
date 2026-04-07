import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@orchex/core-types': new URL('../core-types/src/index.ts', import.meta.url).pathname,
      '@orchex/manifest-schema': new URL('../manifest-schema/src/index.ts', import.meta.url).pathname,
      '@orchex/registry': new URL('../registry/src/index.ts', import.meta.url).pathname,
      '@orchex/policy': new URL('../policy/src/index.ts', import.meta.url).pathname,
      '@orchex/memory': new URL('../memory/src/index.ts', import.meta.url).pathname,
    },
  },
});
