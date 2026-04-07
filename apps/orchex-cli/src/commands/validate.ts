import { Command } from 'commander'
import { loadPackage, validatePackageLayout } from '@orchex/manifest-schema'
import { resolve } from 'path'

export function makeValidateCommand(): Command {
  return new Command('validate')
    .description('Validate a subagent package directory')
    .argument('<dir>', 'Path to the package directory')
    .option('--strict', 'Enable strict validation (JSON-parse schema files)')
    .action(async (dir: string, opts: { strict?: boolean }) => {
      const absDir = resolve(dir)

      const loaded = loadPackage(absDir)
      if (!loaded.success) {
        console.error(`✗ Manifest error: ${loaded.error.message}`)
        process.exit(1)
        return
      }

      const errors = validatePackageLayout(absDir, loaded.result.manifest, { strict: opts.strict ?? false })
      if (errors.length > 0) {
        for (const e of errors) {
          console.error(`✗ ${e.message}`)
        }
        process.exit(1)
        return
      }

      console.log(`✓ ${loaded.result.manifest.metadata.name}@${loaded.result.manifest.metadata.version} is valid`)
    })
}
