import type { Command } from 'commander'
import { makeValidateCommand } from './validate.js'
import { makePublishCommand } from './publish.js'

export function registerCommands(program: Command): void {
  program.addCommand(makeValidateCommand())
  program.addCommand(makePublishCommand())
}
