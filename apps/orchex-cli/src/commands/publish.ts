import { Command } from 'commander'
import { RegistryService } from '@orchex/registry'
import { resolve } from 'path'

export function makePublishCommand(): Command {
  return new Command('publish')
    .description('Publish a subagent package to the local registry')
    .argument('<dir>', 'Path to the package directory')
    .action(async (dir: string) => {
      const absDir = resolve(dir)
      const registry = new RegistryService()
      try {
        const result = await registry.publish(absDir)
        console.log(`✓ Published ${result.name}@${result.version}`)
        console.log(`  Signature: ${result.signature}`)
        console.log(`  Tarball: ${result.tarballPath}`)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`✗ Publish failed: ${msg}`)
        process.exit(1)
      } finally {
        registry.close()
      }
    })
}
