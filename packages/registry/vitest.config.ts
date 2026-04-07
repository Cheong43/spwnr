import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: { environment: 'node' },
  resolve: {
    alias: {
      '@orchex/core-types': resolve(__dirname, '../core-types/src/index.ts'),
      '@orchex/manifest-schema': resolve(__dirname, '../manifest-schema/src/index.ts'),
    },
  },
})
