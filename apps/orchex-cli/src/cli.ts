#!/usr/bin/env node
import { Command } from 'commander'

const program = new Command()

program
  .name('orchex')
  .description('Orchex — Subagent package manager')
  .version('0.1.0')

// Commands will be registered in separate files and imported here
// (validate, publish, install, list, info)

program.parse(process.argv)
