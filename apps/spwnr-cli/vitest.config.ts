import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: { environment: 'node' },
  resolve: {
    alias: {
      '@spwnr/core-types': resolve(__dirname, '../../packages/core-types/src/index.ts'),
      '@spwnr/injector': resolve(__dirname, '../../packages/injector/src/index.ts'),
      '@spwnr/manifest-schema': resolve(__dirname, '../../packages/manifest-schema/src/index.ts'),
      '@spwnr/registry': resolve(__dirname, '../../packages/registry/src/index.ts'),
    },
  },
})
