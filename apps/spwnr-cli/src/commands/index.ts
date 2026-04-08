import type { Command } from 'commander'
import { makeValidateCommand } from './validate.js'
import { makePublishCommand } from './publish.js'
import { makeInstallCommand } from './install.js'
import { makeListCommand } from './list.js'
import { makeInfoCommand } from './info.js'
import { makeInjectCommand } from './inject.js'
import { makeSessionCommand } from './session.js'
import { makeRunCommand } from './run.js'

export function registerCommands(program: Command): void {
  program.addCommand(makeValidateCommand())
  program.addCommand(makePublishCommand())
  program.addCommand(makeInstallCommand())
  program.addCommand(makeListCommand())
  program.addCommand(makeInfoCommand())
  program.addCommand(makeInjectCommand())
  program.addCommand(makeSessionCommand())
  program.addCommand(makeRunCommand())
}
