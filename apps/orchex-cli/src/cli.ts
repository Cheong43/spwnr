#!/usr/bin/env node
import { Command } from 'commander'
import { registerCommands } from './commands/index.js'

const program = new Command()

program
  .name('orchex')
  .description('Orchex — Subagent package manager')
  .version('0.1.0')

registerCommands(program)

program.parse(process.argv)
