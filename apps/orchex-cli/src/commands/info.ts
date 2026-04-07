import { Command } from 'commander'
import { RegistryService } from '@orchex/registry'

export function makeInfoCommand(): Command {
  return new Command('info')
    .description('Show details about a subagent package')
    .argument('<name>', 'Package name')
    .argument('[version]', 'Version (default: latest)', 'latest')
    .action((name: string, version: string) => {
      const registry = new RegistryService()
      try {
        const info = registry.info(name, version)
        console.log(`Name:      ${info.name}`)
        console.log(`Version:   ${info.version}`)
        console.log(`Published: ${info.publishedAt}`)
        console.log(`Signature: ${info.signature}`)
        console.log(`Tarball:   ${info.tarballPath}`)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`✗ ${msg}`)
        process.exit(1)
        return
      } finally {
        registry.close()
      }
    })
}
