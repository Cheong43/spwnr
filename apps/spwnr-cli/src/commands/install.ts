import { Command } from 'commander'
import { RegistryService } from '@spwnr/registry'

export function makeInstallCommand(): Command {
  return new Command('install')
    .description('Install a subagent package from the local registry')
    .argument('<name>', 'Package name')
    .argument('[version]', 'Version to install (default: latest)', 'latest')
    .action(async (name: string, version: string) => {
      const registry = new RegistryService()
      try {
        const result = await registry.install(name, version)
        console.log(`✓ Installed ${result.name}@${result.version}`)
        console.log(`  Location: ${result.installedDir}`)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`✗ Install failed: ${msg}`)
        process.exit(1)
        return
      } finally {
        registry.close()
      }
    })
}
