import { join } from 'path';
import { OrchexError, ErrorCodes } from '@orchex/core-types';
import type { RunStatus } from '@orchex/core-types';
import { getOrchexHome } from '@orchex/registry';
import { PolicyMerger } from '@orchex/policy';
import type { RunStore, CheckpointStore, AgentMemoryStore, ArtifactStore } from '@orchex/memory';
import type { RegistryService } from '@orchex/registry';
import type { BackendSelector } from './backend-selector.js';
import type { RetryStrategy } from './retry-strategy.js';
import type { BrokerRunOptions, RunResult } from './types.js';

export class RuntimeBroker {
  constructor(
    private runStore: RunStore,
    private checkpointStore: CheckpointStore,
    // agentMemory is reserved for future per-run key-value storage (not yet used in run orchestration)
    private agentMemory: AgentMemoryStore,
    private artifactStore: ArtifactStore,
    private policyMerger: PolicyMerger,
    private registry: RegistryService,
    private backendSelector: BackendSelector,
    private retryStrategy: RetryStrategy,
  ) {}

  async run(options: BrokerRunOptions): Promise<RunResult> {
    // 1. Create run record (CREATED status) — use the store's canonical runId
    const runRecord = this.runStore.create({
      packageName: options.packageName,
      version: options.version ?? 'latest',
      input: options.input ?? {},
    });
    const runId = runRecord.runId;
    const workDir = join(getOrchexHome(), 'runs', runId);

    try {
      // 2. Load manifest — info() throws OrchexError if not found
      const info = this.registry.info(options.packageName, options.version ?? 'latest');
      const manifest = info.manifest;

      // 3. Merge policy (package permissions → org → request)
      const effectivePolicy = this.policyMerger.merge({
        packagePolicy: [],
        orgPolicy: [],
        requestPolicy: [],
      });

      // 4. VALIDATED
      this.runStore.updateStatus(runId, 'VALIDATED' as RunStatus);

      // 5. Select backend
      const adapter = await this.backendSelector.select(options.backendPreference);

      // 6. SCHEDULED
      this.runStore.updateStatus(runId, 'SCHEDULED' as RunStatus);

      // 7. Stream adapter events, with retry support
      const input = options.input ?? {};
      await this.retryStrategy.execute(async () => {
        const currentRun = this.runStore.get(runId);
        if (currentRun && ['COMPLETED', 'FAILED', 'CANCELLED'].includes(currentRun.status)) {
          return;
        }
        for await (const event of adapter.run({ runId, manifest, input, policy: effectivePolicy, workDir })) {
          if (event.type === 'started') {
            this.runStore.updateStatus(runId, 'RUNNING' as RunStatus);
          } else if (event.type === 'checkpoint') {
            const data = event.data as Record<string, unknown> | undefined;
            const stepName = typeof data?.step === 'string' ? data.step : 'checkpoint';
            this.checkpointStore.save(runId, stepName, data ?? {});
          } else if (event.type === 'completed') {
            this.runStore.updateStatus(runId, 'COMPLETED' as RunStatus);
          } else if (event.type === 'failed') {
            this.runStore.updateStatus(runId, 'FAILED' as RunStatus, {
              errorCode: String(event.data ?? 'unknown'),
            });
          }
        }
      });

      const finalRun = this.runStore.get(runId);
      if (!finalRun) throw new OrchexError(ErrorCodes.RUN_NOT_FOUND, `Run record missing after execution: ${runId}`);
      const artifacts = this.artifactStore.list(runId);

      return {
        runId,
        status: finalRun.status,
        artifacts,
        error: finalRun.errorCode,
      };
    } catch (err) {
      if (err instanceof OrchexError) {
        try {
          this.runStore.updateStatus(runId, 'FAILED' as RunStatus, { errorCode: err.code });
        } catch {
          // ignore if already in terminal state
        }
        throw err;
      }
      const msg = err instanceof Error ? err.message : String(err);
      try {
        this.runStore.updateStatus(runId, 'FAILED' as RunStatus, { errorCode: ErrorCodes.INTERNAL_ERROR });
      } catch {
        // ignore if already in terminal state
      }
      throw new OrchexError(ErrorCodes.INTERNAL_ERROR, msg);
    }
  }
}
