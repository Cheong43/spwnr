import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { Command, Option } from 'commander'
import { HostScope, HostType } from '@spwnr/core-types'
import { injectStatic, resolveDefaultStaticTarget } from '@spwnr/injector'
import { RegistryService } from '@spwnr/registry'
import { loadWorkerPolicy } from './worker-policy.js'

interface ResolveWorkersActionOptions {
  host: string
  scope: string
  search: string
  format: 'json' | 'text'
  limit: string
  ensure?: boolean
  target?: string
  select?: string[]
}

interface EnsureResult {
  name: string
  status: 'already_present' | 'injected'
  targetPath: string
}

function slugifyAgentName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function extensionForHost(host: HostType): string {
  switch (host) {
    case 'codex':
      return '.toml'
    case 'copilot':
      return '.agent.md'
    case 'claude_code':
    case 'opencode':
      return '.md'
  }
}

function targetPathForPackage(packageName: string, host: HostType, targetDir: string): string {
  return join(targetDir, `${slugifyAgentName(packageName)}${extensionForHost(host)}`)
}

function collectValues(value: string, previous: string[] = []): string[] {
  return [...previous, value]
}

function parseSelectedPackages(values: string[] = []): string[] {
  const selected: string[] = []

  for (const value of values) {
    const packageName = value.trim()
    if (!packageName) {
      throw new Error('Invalid --select value. Use a package name.')
    }

    selected.push(packageName)
  }

  return selected
}

async function ensureSelectedPackages(
  registry: RegistryService,
  selected: string[],
  options: {
    host: HostType
    scope: HostScope
    targetDir?: string
  },
): Promise<EnsureResult[]> {
  const seen = new Set<string>()
  const ensured: EnsureResult[] = []
  const targetDir = options.targetDir ?? resolveDefaultStaticTarget(options.host, options.scope)

  for (const packageName of selected) {
    if (seen.has(packageName)) {
      continue
    }
    seen.add(packageName)

    const info = registry.info(packageName, 'latest')
    const compatibilityHosts = info.manifest.spec.compatibility?.hosts ?? []
    if (!compatibilityHosts.includes(options.host)) {
      throw new Error(`Selected package ${packageName} is not compatible with host ${options.host}.`)
    }

    const targetPath = targetPathForPackage(packageName, options.host, targetDir)
    if (existsSync(targetPath)) {
      ensured.push({
        name: packageName,
        status: 'already_present',
        targetPath,
      })
      continue
    }

    await injectStatic({
      packageName,
      version: 'latest',
      host: options.host,
      scope: options.scope,
      targetDir: options.targetDir,
      registry,
    })

    ensured.push({
      name: packageName,
      status: 'injected',
      targetPath,
    })
  }

  return ensured
}

export function makeResolveWorkersCommand(): Command {
  const command = new Command('resolve-workers')
    .description('Build a dynamic agent lineup candidate pool from the local Spwnr registry')
    .requiredOption('--search <query>', 'Search query used to find candidate agents via BM25')
    .addOption(new Option('--host <host>', 'Target host').choices(Object.values(HostType)).makeOptionMandatory())
    .addOption(new Option('--scope <scope>', 'Injection scope for --ensure').choices(Object.values(HostScope)).default(HostScope.PROJECT))
    .option('--target <dir>', 'Override injection target directory for --ensure')
    .option('--format <format>', 'Output format', 'text')
    .option('--limit <n>', 'Maximum candidates to return', '8')
    .option('--ensure', 'Inject selected packages into the target host scope after resolution')
    .option('--select <name>', 'Selected package to ensure (repeatable)', collectValues, [])
    .action(async (options: ResolveWorkersActionOptions) => {
      const registry = new RegistryService()

      try {
        const { path: policyPath, policy } = loadWorkerPolicy()
        const host = options.host as HostType
        const scope = options.scope as HostScope
        const limit = Math.max(1, Number.parseInt(options.limit, 10) || 8)
        const candidates = registry.searchPackages({
          query: options.search,
          host,
          domain: policy.preferredDomain,
          limit,
        })
        const selected = parseSelectedPackages(options.select)

        if (selected.length > policy.lineup.maxAgents) {
          throw new Error(`Selected lineup allows at most ${policy.lineup.maxAgents} package(s).`)
        }

        if (options.ensure && selected.length < policy.lineup.minAgents) {
          throw new Error(
            `Selected lineup requires at least ${policy.lineup.minAgents} package(s). Provide --select <package-name> before using --ensure.`,
          )
        }

        const ensured = options.ensure
          ? await ensureSelectedPackages(registry, selected, {
              host,
              scope,
              targetDir: options.target,
            })
          : []

        const payload = {
          searchQuery: options.search,
          host,
          scope,
          policyPath,
          policy,
          candidates,
          missingMinimumSelection: selected.length < policy.lineup.minAgents,
          selected,
          ensured,
        }

        if (options.format === 'json') {
          process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`)
          return
        }

        console.log(`Dynamic worker policy: ${policyPath ?? 'default in-memory policy'}`)
        console.log(`Selection mode: ${policy.selectionMode}`)
        console.log(`Registry source: ${policy.registrySource}`)
        if (policy.preferredDomain) {
          console.log(`Preferred domain: ${policy.preferredDomain}`)
        }
        console.log(`Lineup range: ${policy.lineup.minAgents}-${policy.lineup.maxAgents} agent(s)`)
        console.log('')
        console.log('candidate pool')
        for (const candidate of candidates) {
          const domains = candidate.domains.length > 0 ? candidate.domains.join(', ') : '—'
          const hosts = candidate.hosts.length > 0 ? candidate.hosts.join(', ') : '—'
          console.log(`  - ${candidate.agentName}@${candidate.version}`)
          console.log(`    domains:  ${domains}`)
          console.log(`    summary:  ${candidate.summary}`)
          console.log(`    hosts:    ${hosts}`)
        }

        if (options.ensure) {
          console.log('')
          console.log('ensured packages')
          for (const result of ensured) {
            console.log(`  - ${result.name}: ${result.status} (${result.targetPath})`)
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`✗ Resolve workers failed: ${msg}`)
        process.exit(1)
      } finally {
        registry.close()
      }
    })

  return command
}
