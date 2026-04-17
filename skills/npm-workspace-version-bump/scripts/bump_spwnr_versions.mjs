#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '../../..')

const args = process.argv.slice(2)
const version = args[0]
const dryRun = args.includes('--dry-run')

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('Usage: node scripts/bump_spwnr_versions.mjs <x.y.z> [--dry-run]')
  process.exit(1)
}

const jsonFiles = [
  'package.json',
  '.claude-plugin/plugin.json',
  '.claude-plugin/marketplace.json',
  'apps/spwnr-cli/package.json',
  'packages/adapters/package.json',
  'packages/broker/package.json',
  'packages/core-types/package.json',
  'packages/injector/package.json',
  'packages/manifest-schema/package.json',
  'packages/memory/package.json',
  'packages/policy/package.json',
  'packages/registry/package.json',
]

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(repoRoot, relativePath), 'utf8'))
}

function writeJson(relativePath, value) {
  const absolutePath = join(repoRoot, relativePath)
  writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`)
}

function updateVersionPayload(relativePath, payload) {
  if (relativePath === '.claude-plugin/marketplace.json') {
    return {
      ...payload,
      plugins: Array.isArray(payload.plugins)
        ? payload.plugins.map((plugin) => ({ ...plugin, version }))
        : payload.plugins,
    }
  }

  return {
    ...payload,
    version,
  }
}

const updatedFiles = jsonFiles.map((relativePath) => {
  const payload = readJson(relativePath)
  const nextPayload = updateVersionPayload(relativePath, payload)
  return {
    relativePath,
    before: relativePath === '.claude-plugin/marketplace.json'
      ? payload.plugins?.map((plugin) => plugin.version)
      : payload.version,
    after: relativePath === '.claude-plugin/marketplace.json'
      ? nextPayload.plugins?.map((plugin) => plugin.version)
      : nextPayload.version,
    nextPayload,
  }
})

for (const file of updatedFiles) {
  console.log(`${dryRun ? 'would update' : 'updated'} ${file.relativePath}: ${JSON.stringify(file.before)} -> ${JSON.stringify(file.after)}`)
  if (!dryRun) {
    writeJson(file.relativePath, file.nextPayload)
  }
}
