import { existsSync, readdirSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { Command } from 'commander'
import { RegistryService } from '@spwnr/registry'

function findDefaultRegistrySource(cwd: string): string | null {
  const candidates = [
    resolve(cwd, 'vendor', 'spwnr-registry'),
    resolve(cwd),
  ]

  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'templates'))) {
      return candidate
    }
  }

  return null
}

function resolveTemplatesRoot(sourceDir: string): string {
  const absoluteSource = resolve(sourceDir)
  const nestedTemplates = join(absoluteSource, 'templates')

  if (existsSync(nestedTemplates)) {
    return nestedTemplates
  }

  if (existsSync(absoluteSource)) {
    return absoluteSource
  }

  throw new Error(`Registry source not found: ${sourceDir}`)
}

function listTemplateVersionDirs(templatesRoot: string): string[] {
  const versionDirs: string[] = []

  for (const templateEntry of readdirSync(templatesRoot, { withFileTypes: true })) {
    if (!templateEntry.isDirectory()) {
      continue
    }

    const templateRoot = join(templatesRoot, templateEntry.name)
    for (const versionEntry of readdirSync(templateRoot, { withFileTypes: true })) {
      if (!versionEntry.isDirectory()) {
        continue
      }

      versionDirs.push(join(templateRoot, versionEntry.name))
    }
  }

  return versionDirs.sort((left, right) => left.localeCompare(right))
}

export function makeSyncRegistryCommand(): Command {
  return new Command('sync-registry')
    .description('Publish vendored registry templates into the local Spwnr registry')
    .argument('[dir]', 'Registry source directory (defaults to vendor/spwnr-registry when present)')
    .action(async (dir?: string) => {
      const registry = new RegistryService()

      try {
        const sourceDir = dir ?? findDefaultRegistrySource(process.cwd())
        if (!sourceDir) {
          throw new Error('No registry source found. Pass a path or run from a repo that has vendor/spwnr-registry.')
        }

        const templatesRoot = resolveTemplatesRoot(sourceDir)
        const existing = new Set(
          registry.list().flatMap((pkg) => pkg.versions.map((version) => `${pkg.name}@${version}`)),
        )

        let published = 0
        let skipped = 0
        let failed = 0

        for (const versionDir of listTemplateVersionDirs(templatesRoot)) {
          const packageDir = resolve(versionDir)
          const packageName = basename(dirname(packageDir))
          const version = basename(packageDir)
          const versionKey = `${packageName}@${version}`

          if (existing.has(versionKey)) {
            skipped += 1
            console.log(`- skipped ${versionKey}`)
            continue
          }

          try {
            const result = await registry.publish(packageDir)
            existing.add(`${result.name}@${result.version}`)
            published += 1
            console.log(`+ published ${result.name}@${result.version}`)
          } catch (error: unknown) {
            failed += 1
            const message = error instanceof Error ? error.message : String(error)
            console.error(`! failed ${versionKey}: ${message}`)
          }
        }

        console.log(`Summary: published=${published} skipped=${skipped} failed=${failed}`)

        if (failed > 0) {
          process.exit(1)
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`✗ Sync registry failed: ${msg}`)
        process.exit(1)
      } finally {
        registry.close()
      }
    })
}
