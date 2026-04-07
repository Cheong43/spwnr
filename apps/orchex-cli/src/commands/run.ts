import { Command } from 'commander'
import { RuntimeBroker, BackendSelector, RetryStrategy } from '@orchex/broker'
import { AdapterRegistry, OpenCodeAdapter, ClaudeAdapter, SimulatedAdapter } from '@orchex/adapters'
import { RunStore, CheckpointStore, AgentMemoryStore, ArtifactStore, openRunDatabase } from '@orchex/memory'
import { PolicyMerger } from '@orchex/policy'
import { RegistryService } from '@orchex/registry'
import type { BackendType } from '@orchex/core-types'

export function makeRunCommand(): Command {
  return new Command('run')
    .description('Run a subagent package')
    .argument('<name>', 'Package name')
    .argument('[version]', 'Package version')
    .option('--input <json>', 'Input JSON string', '{}')
    .option('--backend <type>', 'Backend type (opencode, claude_code, simulated)')
    .option('--watch', 'Watch for run completion (not yet implemented)')
    .action(async (name: string, version: string | undefined, options) => {
      let input: Record<string, unknown>
      try {
        input = JSON.parse(options.input)
      } catch {
        console.error('Error: --input must be valid JSON')
        process.exit(1)
        return
      }

      const backendPreference = options.backend as BackendType | undefined

      try {
        const registry = new RegistryService()

        const runDb = openRunDatabase()
        const runStore = new RunStore(runDb)
        const checkpointStore = new CheckpointStore(runDb)
        const agentMemory = new AgentMemoryStore(runDb)
        const artifactStore = new ArtifactStore()

        const policyMerger = new PolicyMerger()

        const adapterRegistry = new AdapterRegistry()
        adapterRegistry.register(new SimulatedAdapter())
        adapterRegistry.register(new OpenCodeAdapter())
        adapterRegistry.register(new ClaudeAdapter())

        const backendSelector = new BackendSelector(adapterRegistry.getAll())
        const retryStrategy = new RetryStrategy({ maxRetries: 2, delayMs: 1000 })

        const broker = new RuntimeBroker(
          runStore,
          checkpointStore,
          agentMemory,
          artifactStore,
          policyMerger,
          registry,
          backendSelector,
          retryStrategy,
        )

        console.log(`Running ${name}${version ? `@${version}` : ''}...`)

        const result = await broker.run({
          packageName: name,
          version,
          input,
          backendPreference,
        })

        console.log(`Run ${result.runId}`)
        console.log(`Status: ${result.status}`)
        if (result.artifacts.length > 0) {
          console.log(`Artifacts: ${result.artifacts.join(', ')}`)
        }
        if (result.error) {
          console.error(`Error: ${result.error}`)
          process.exit(1)
        }
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`)
        process.exit(1)
      }
    })
}
