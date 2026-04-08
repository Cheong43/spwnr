import { Command } from 'commander'
import { RegistryService } from '@spwnr/registry'
import type { InjectionHosts, SubagentManifest } from '@spwnr/core-types'

export function makeInfoCommand(): Command {
  return new Command('info')
    .description('Show details about a subagent package')
    .argument('<name>', 'Package name')
    .argument('[version]', 'Version (default: latest)', 'latest')
    .action((name: string, version: string) => {
      const registry = new RegistryService()
      try {
        const info = registry.info(name, version)
        const schemas = formatSchemas(info.manifest)
        console.log(`Name:      ${info.name}`)
        console.log(`Version:   ${info.version}`)
        console.log(`Instruction: ${info.manifest.metadata.instruction}`)
        console.log(`Schemas:   ${schemas}`)
        console.log(`Published: ${info.publishedAt}`)
        console.log(`Signature: ${info.signature}`)
        console.log(`Tarball:   ${info.tarballPath}`)
        const matrix = formatInjectionMatrix(info.manifest)
        if (matrix.length > 0) {
          console.log('Hosts:')
          for (const line of matrix) {
            console.log(`  ${line}`)
          }
        }
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

function formatSchemas(manifest: SubagentManifest): string {
  const labels = Object.entries(manifest.spec.schemas ?? {})
    .filter(([, path]) => Boolean(path))
    .map(([schemaName]) => schemaName)

  return labels.length > 0 ? labels.join(', ') : 'none'
}

function formatInjectionMatrix(manifest: SubagentManifest): string[] {
  const hosts = manifest.spec.compatibility?.hosts ?? []
  const injectionHosts = manifest.spec.injection?.hosts ?? {}

  return hosts.map((host) => {
    const config = injectionHosts[host as keyof InjectionHosts]
    const modes = [
      config?.static?.enabled ? `static(${config.static.defaultScope ?? 'project'})` : null,
      config?.session?.enabled ? `session(${config.session.defaultScope ?? 'project'})` : null,
    ].filter(Boolean)

    return `${host}: ${modes.length > 0 ? modes.join(', ') : 'declared in compatibility only'}`
  })
}
