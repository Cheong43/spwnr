#!/usr/bin/env node
import { Command } from 'commander'
import { readFileSync } from 'node:fs'

function readCliVersion(): string {
  const packageJsonPath = new URL('../package.json', import.meta.url)
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as { version?: string }
  return packageJson.version ?? '0.0.0'
}

const version = readCliVersion()

if (process.argv.includes('-V') || process.argv.includes('--version')) {
  console.log(version)
  process.exit(0)
}

const program = new Command()

program
  .name('spwnr')
  .description('Spwnr — Agent package manager')
  .version(version)

const { registerCommands } = await import('./commands/index.js')
registerCommands(program)

program.parse(process.argv)
