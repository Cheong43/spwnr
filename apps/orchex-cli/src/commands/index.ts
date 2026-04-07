import type { Command } from 'commander'
import { makeValidateCommand } from './validate.js'

export function registerCommands(program: Command): void {
  program.addCommand(makeValidateCommand())
}
