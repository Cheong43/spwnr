import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join, resolve, dirname } from 'path';
import { mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';

import { RuntimeBroker } from './runtime-broker.js';
import { BackendSelector } from './backend-selector.js';
import { RetryStrategy } from './retry-strategy.js';
import type { BackendAdapterRunOptions, AdapterEvent } from './types.js';

import { RegistryService } from '@spwnr/registry';
import { openRunDatabase, RunStore, CheckpointStore, AgentMemoryStore, ArtifactStore } from '@spwnr/memory';
import { PolicyMerger } from '@spwnr/policy';
import { SimulatedAdapter } from '@spwnr/adapters';
import { SpwnrError, ErrorCodes } from '@spwnr/core-types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const EXAMPLE_PKG = resolve(__dirname, '../../../examples/code-reviewer');

let tempDir: string;

beforeEach(() => {
  tempDir = join(tmpdir(), randomUUID());
  mkdirSync(tempDir, { recursive: true });
  process.env.SPWNR_HOME = tempDir;
});

afterEach(() => {
  delete process.env.SPWNR_HOME;
  rmSync(tempDir, { recursive: true, force: true });
});

function makeBroker(adapterEvents?: Array<{ type: AdapterEvent['type']; data?: unknown }>) {
  const registry = new RegistryService();
  const runDb = openRunDatabase();

  const runStore = new RunStore(runDb);
  const checkpointStore = new CheckpointStore(runDb);
  const agentMemory = new AgentMemoryStore(runDb);
  const artifactStore = new ArtifactStore();
  const policyMerger = new PolicyMerger();

  const simAdapter = new SimulatedAdapter({
    events: adapterEvents ?? [
      { type: 'started' },
      { type: 'completed' },
    ],
  });
  const backendSelector = new BackendSelector([simAdapter]);
  const retryStrategy = new RetryStrategy({ maxRetries: 0, delayMs: 0 });

  const broker = new RuntimeBroker(
    runStore,
    checkpointStore,
    agentMemory,
    artifactStore,
    policyMerger,
    registry,
    backendSelector,
    retryStrategy,
  );

  return { broker, registry, runStore, checkpointStore };
}

describe('Integration: M3+M4+M5 lifecycle', () => {
  it('publish then run succeeds', async () => {
    const { broker, registry } = makeBroker();
    await registry.publish(EXAMPLE_PKG);

    const result = await broker.run({ packageName: 'code-reviewer' });

    expect(result.status).toBe('COMPLETED');
  });

  it('runId is a valid UUID', async () => {
    const { broker, registry } = makeBroker();
    await registry.publish(EXAMPLE_PKG);

    const result = await broker.run({ packageName: 'code-reviewer' });

    expect(result.runId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('run record is persisted in store with COMPLETED status', async () => {
    const { broker, registry, runStore } = makeBroker();
    await registry.publish(EXAMPLE_PKG);

    const result = await broker.run({ packageName: 'code-reviewer' });

    const record = runStore.get(result.runId);
    expect(record).not.toBeNull();
    expect(record?.status).toBe('COMPLETED');
  });

  it('checkpoint is persisted when adapter emits checkpoint event', async () => {
    const { broker, registry, checkpointStore } = makeBroker([
      { type: 'started' },
      { type: 'checkpoint', data: { step: 'analysis', findings: 3 } },
      { type: 'completed' },
    ]);
    await registry.publish(EXAMPLE_PKG);

    const result = await broker.run({ packageName: 'code-reviewer' });

    const checkpoint = checkpointStore.load(result.runId, 'analysis');
    expect(checkpoint).not.toBeNull();
    expect(checkpoint?.workflowStep).toBe('analysis');
    expect(checkpoint?.state).toEqual({ step: 'analysis', findings: 3 });
  });

  it('failed run returns FAILED status', async () => {
    const { broker, registry } = makeBroker([
      { type: 'started' },
      { type: 'failed', data: 'tool error' },
    ]);
    await registry.publish(EXAMPLE_PKG);

    const result = await broker.run({ packageName: 'code-reviewer' });

    expect(result.status).toBe('FAILED');
    expect(result.error).toBe('tool error');
  });

  it('running an unpublished package throws PACKAGE_NOT_FOUND', async () => {
    const { broker } = makeBroker();

    await expect(
      broker.run({ packageName: 'code-reviewer' }),
    ).rejects.toMatchObject({ code: ErrorCodes.PACKAGE_NOT_FOUND });
  });

  it('input is passed through to the adapter', async () => {
    let capturedInput: Record<string, unknown> | null = null;

    class CapturingAdapter extends SimulatedAdapter {
      async *run(opts: BackendAdapterRunOptions): AsyncIterableIterator<AdapterEvent> {
        capturedInput = opts.input;
        yield* super.run(opts);
      }
    }

    const registry = new RegistryService();
    const runDb = openRunDatabase();
    const runStore = new RunStore(runDb);
    const checkpointStore = new CheckpointStore(runDb);
    const agentMemory = new AgentMemoryStore(runDb);
    const artifactStore = new ArtifactStore();
    const policyMerger = new PolicyMerger();
    const adapter = new CapturingAdapter({ events: [{ type: 'started' }, { type: 'completed' }] });
    const backendSelector = new BackendSelector([adapter]);
    const retryStrategy = new RetryStrategy({ maxRetries: 0, delayMs: 0 });
    const broker = new RuntimeBroker(
      runStore, checkpointStore, agentMemory, artifactStore,
      policyMerger, registry, backendSelector, retryStrategy,
    );

    await registry.publish(EXAMPLE_PKG);
    await broker.run({ packageName: 'code-reviewer', input: { pr: 42, branch: 'main' } });

    expect(capturedInput).toEqual({ pr: 42, branch: 'main' });
  });

  it('multiple sequential runs produce independent run records', async () => {
    const { broker, registry, runStore } = makeBroker();
    await registry.publish(EXAMPLE_PKG);

    const result1 = await broker.run({ packageName: 'code-reviewer' });
    const result2 = await broker.run({ packageName: 'code-reviewer' });

    expect(result1.runId).not.toBe(result2.runId);
    expect(runStore.get(result1.runId)).not.toBeNull();
    expect(runStore.get(result2.runId)).not.toBeNull();
    expect(runStore.get(result1.runId)?.status).toBe('COMPLETED');
    expect(runStore.get(result2.runId)?.status).toBe('COMPLETED');
  });
});
