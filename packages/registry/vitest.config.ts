import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: { environment: 'node' },
  resolve: {
    alias: {
      '@spwnr/core-types': resolve(__dirname, '../core-types/src/index.ts'),
      '@spwnr/manifest-schema': resolve(__dirname, '../manifest-schema/src/index.ts'),
    },
  },
})
