import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: { environment: 'node' },
  resolve: {
    alias: {
      '@spwnr/adapters': resolve(__dirname, '../adapters/src/index.ts'),
      '@spwnr/core-types': resolve(__dirname, '../core-types/src/index.ts'),
      '@spwnr/registry': resolve(__dirname, '../registry/src/index.ts'),
    },
  },
});
