import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: { environment: 'node' },
  resolve: {
    alias: {
      '@orchex/core-types': resolve(__dirname, '../../packages/core-types/src/index.ts'),
      '@orchex/manifest-schema': resolve(__dirname, '../../packages/manifest-schema/src/index.ts'),
      '@orchex/registry': resolve(__dirname, '../../packages/registry/src/index.ts'),
      '@orchex/broker': resolve(__dirname, '../../packages/broker/src/index.ts'),
      '@orchex/adapters': resolve(__dirname, '../../packages/adapters/src/index.ts'),
      '@orchex/memory': resolve(__dirname, '../../packages/memory/src/index.ts'),
      '@orchex/policy': resolve(__dirname, '../../packages/policy/src/index.ts'),
    },
  },
})
