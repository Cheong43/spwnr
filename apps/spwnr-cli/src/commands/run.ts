import { Command } from 'commander'

export function makeRunCommand(): Command {
  return new Command('run')
    .allowUnknownOption(true)
    .description('Deprecated runtime entrypoint')
    .argument('[name]', 'Package name')
    .argument('[version]', 'Package version')
    .action(() => {
      console.error('✗ `spwnr run` has been deprecated. Use `spwnr inject` or `spwnr session` instead.')
      process.exit(1)
    })
}
