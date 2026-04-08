import { Command } from 'commander'
import { RegistryService } from '@spwnr/registry'

export function makeListCommand(): Command {
  return new Command('list')
    .alias('ls')
    .description('List published subagent packages in the local registry')
    .action(() => {
      const registry = new RegistryService()
      try {
        const packages = registry.list()
        if (packages.length === 0) {
          console.log('No packages published.')
          return
        }
        for (const pkg of packages) {
          const latest = pkg.latestVersion ? ` (latest: ${pkg.latestVersion})` : ''
          console.log(`${pkg.name}${latest}`)
          for (const v of pkg.versions) {
            console.log(`  - ${v}`)
          }
        }
      } finally {
        registry.close()
      }
    })
}
