import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@orchex/core-types': resolve(__dirname, '../core-types/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
  },
})
