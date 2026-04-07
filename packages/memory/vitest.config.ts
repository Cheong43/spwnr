import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: { environment: 'node' },
  resolve: {
    alias: {
      '@orchex/core-types': resolve(__dirname, '../core-types/src/index.ts'),
      '@orchex/registry': resolve(__dirname, '../registry/src/index.ts'),
    },
  },
})
