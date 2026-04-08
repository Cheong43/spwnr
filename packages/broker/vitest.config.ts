import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@spwnr/core-types': new URL('../core-types/src/index.ts', import.meta.url).pathname,
      '@spwnr/manifest-schema': new URL('../manifest-schema/src/index.ts', import.meta.url).pathname,
      '@spwnr/registry': new URL('../registry/src/index.ts', import.meta.url).pathname,
      '@spwnr/policy': new URL('../policy/src/index.ts', import.meta.url).pathname,
      '@spwnr/memory': new URL('../memory/src/index.ts', import.meta.url).pathname,
      '@spwnr/adapters': new URL('../adapters/src/index.ts', import.meta.url).pathname,
    },
  },
});
