import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RuntimeBroker } from './runtime-broker.js';
import { BackendSelector } from './backend-selector.js';
import { RetryStrategy } from './retry-strategy.js';
import { PolicyMerger } from '@orchex/policy';
import { BackendType, ErrorCodes, OrchexError } from '@orchex/core-types';
import type { RunStore, CheckpointStore, AgentMemoryStore, ArtifactStore } from '@orchex/memory';
import type { RegistryService } from '@orchex/registry';
import type { BackendAdapter, AdapterEvent, BackendAdapterRunOptions } from './types.js';
import type { SubagentManifest } from '@orchex/core-types';

const makeManifest = (name = 'test-pkg'): SubagentManifest => ({
  apiVersion: 'v1',
  kind: 'Subagent',
  metadata: { name, version: '1.0.0' },
  spec: {
    input: { schema: '{}' },
    output: { schema: '{}' },
    workflow: { entry: 'start' },
  },
});

class SimulatedAdapter implements BackendAdapter {
  readonly backendType = BackendType.SIMULATED;
  available = true;
  events: AdapterEvent[] = [];

  async isAvailable(): Promise<boolean> {
    return this.available;
  }

  async *run(opts: BackendAdapterRunOptions): AsyncIterableIterator<AdapterEvent> {
    for (const event of this.events) {
      yield { ...event, runId: opts.runId };
    }
  }
}

function makeRunRecord(runId: string, status: string, errorCode?: string) {
  return {
    runId,
    subagentName: 'test-pkg',
    subagentVersion: '1.0.0',
    status,
    traceId: 'trace-1',
    backend: BackendType.SIMULATED,
    input: {},
    errorCode,
    createdAt: new Date().toISOString(),
  };
}

function makeDeps(overrides: {
  runStore?: Partial<RunStore>;
  checkpointStore?: Partial<CheckpointStore>;
  agentMemory?: Partial<AgentMemoryStore>;
  artifactStore?: Partial<ArtifactStore>;
  registry?: Partial<RegistryService>;
  adapter?: BackendAdapter;
} = {}) {
  const runId = 'fixed-run-id';

  const mockRunStore = {
    create: vi.fn().mockReturnValue(makeRunRecord(runId, 'CREATED')),
    updateStatus: vi.fn((id: string, status: string) => makeRunRecord(id, status)),
    // First call: guard check inside retryStrategy (non-terminal); subsequent calls: finalRun lookup
    get: vi.fn()
      .mockReturnValueOnce(makeRunRecord(runId, 'SCHEDULED'))
      .mockReturnValue(makeRunRecord(runId, 'COMPLETED')),
    list: vi.fn().mockReturnValue([]),
    ...overrides.runStore,
  } as unknown as RunStore;

  const mockCheckpointStore = {
    save: vi.fn().mockReturnValue({}),
    load: vi.fn().mockReturnValue(null),
    listForRun: vi.fn().mockReturnValue([]),
    ...overrides.checkpointStore,
  } as unknown as CheckpointStore;

  const mockAgentMemory = {
    set: vi.fn(),
    get: vi.fn().mockReturnValue(null),
    getAll: vi.fn().mockReturnValue({}),
    delete: vi.fn(),
    ...overrides.agentMemory,
  } as unknown as AgentMemoryStore;

  const mockArtifactStore = {
    list: vi.fn().mockReturnValue([]),
    write: vi.fn(),
    read: vi.fn().mockReturnValue(null),
    getDir: vi.fn().mockReturnValue('/mock/dir'),
    ...overrides.artifactStore,
  } as unknown as ArtifactStore;

  const manifest = makeManifest();
  const mockRegistry = {
    info: vi.fn().mockReturnValue({ name: 'test-pkg', version: '1.0.0', manifest, signature: '', tarballPath: '', publishedAt: '' }),
    publish: vi.fn(),
    install: vi.fn(),
    list: vi.fn().mockReturnValue([]),
    close: vi.fn(),
    ...overrides.registry,
  } as unknown as RegistryService;

  const adapter = overrides.adapter ?? new SimulatedAdapter();
  const backendSelector = new BackendSelector([adapter]);
  const retryStrategy = new RetryStrategy({ maxRetries: 0, delayMs: 0 });
  const policyMerger = new PolicyMerger();

  const broker = new RuntimeBroker(
    mockRunStore,
    mockCheckpointStore,
    mockAgentMemory,
    mockArtifactStore,
    policyMerger,
    mockRegistry,
    backendSelector,
    retryStrategy,
  );

  return { broker, mockRunStore, mockCheckpointStore, mockArtifactStore, mockRegistry, adapter };
}

describe('RuntimeBroker', () => {
  it('successful full run: status transitions and artifacts returned', async () => {
    const simAdapter = new SimulatedAdapter();
    simAdapter.events = [
      { type: 'started', runId: '' },
      { type: 'completed', runId: '' },
    ];

    const { broker, mockRunStore, mockArtifactStore } = makeDeps({ adapter: simAdapter });
    mockArtifactStore.list = vi.fn().mockReturnValue(['output.txt']);

    const result = await broker.run({ packageName: 'test-pkg' });

    expect(result.status).toBe('COMPLETED');
    expect(result.artifacts).toEqual(['output.txt']);

    const statusCalls = (mockRunStore.updateStatus as ReturnType<typeof vi.fn>).mock.calls.map(c => c[1]);
    expect(statusCalls).toContain('RUNNING');
    expect(statusCalls).toContain('COMPLETED');
  });

  it('checkpoint event causes checkpointStore.save to be called', async () => {
    const simAdapter = new SimulatedAdapter();
    simAdapter.events = [
      { type: 'started', runId: '' },
      { type: 'checkpoint', runId: '', data: { step: 'step1', value: 42 } },
      { type: 'completed', runId: '' },
    ];

    const { broker, mockCheckpointStore } = makeDeps({ adapter: simAdapter });

    await broker.run({ packageName: 'test-pkg' });

    expect(mockCheckpointStore.save).toHaveBeenCalledWith(
      expect.any(String),
      'step1',
      { step: 'step1', value: 42 },
    );
  });

  it('run fails when adapter emits failed event', async () => {
    const simAdapter = new SimulatedAdapter();
    simAdapter.events = [
      { type: 'started', runId: '' },
      { type: 'failed', runId: '', data: 'adapter error' },
    ];

    const { broker, mockRunStore } = makeDeps({ adapter: simAdapter });
    (mockRunStore.get as ReturnType<typeof vi.fn>)
      .mockReset()
      .mockReturnValueOnce(makeRunRecord('fixed-run-id', 'SCHEDULED'))
      .mockReturnValue(makeRunRecord('x', 'FAILED', 'adapter error'));

    const result = await broker.run({ packageName: 'test-pkg' });

    expect(result.status).toBe('FAILED');
    const statusCalls = (mockRunStore.updateStatus as ReturnType<typeof vi.fn>).mock.calls.map(c => c[1]);
    expect(statusCalls).toContain('FAILED');
  });

  it('returns FAILED status when package not found', async () => {
    const { broker, mockRunStore, mockRegistry } = makeDeps();
    (mockRegistry.info as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new OrchexError(ErrorCodes.PACKAGE_NOT_FOUND, 'Package not found');
    });

    await expect(broker.run({ packageName: 'missing-pkg' })).rejects.toMatchObject({
      code: ErrorCodes.PACKAGE_NOT_FOUND,
    });

    const statusCalls = (mockRunStore.updateStatus as ReturnType<typeof vi.fn>).mock.calls.map(c => c[1]);
    expect(statusCalls).toContain('FAILED');
  });

  it('backend unavailable results in FAILED status', async () => {
    const unavailableAdapter = new SimulatedAdapter();
    unavailableAdapter.available = false;

    const { broker, mockRunStore } = makeDeps({ adapter: unavailableAdapter });

    await expect(broker.run({ packageName: 'test-pkg' })).rejects.toMatchObject({
      code: ErrorCodes.BACKEND_UNAVAILABLE,
    });

    const statusCalls = (mockRunStore.updateStatus as ReturnType<typeof vi.fn>).mock.calls.map(c => c[1]);
    expect(statusCalls).toContain('FAILED');
  });

  it('multiple runs are independent with separate runIds', async () => {
    const { broker, mockRunStore } = makeDeps();

    await broker.run({ packageName: 'test-pkg' });
    await broker.run({ packageName: 'test-pkg' });

    const createCalls = (mockRunStore.create as ReturnType<typeof vi.fn>).mock.calls;
    expect(createCalls).toHaveLength(2);
  });

  it('passes input to adapter run options', async () => {
    const simAdapter = new SimulatedAdapter();
    const runSpy = vi.spyOn(simAdapter, 'run');
    simAdapter.events = [{ type: 'completed', runId: '' }];

    const { broker } = makeDeps({ adapter: simAdapter });
    await broker.run({ packageName: 'test-pkg', input: { foo: 'bar' } });

    expect(runSpy).toHaveBeenCalledWith(
      expect.objectContaining({ input: { foo: 'bar' } }),
    );
  });

  it('uses backendPreference when selecting adapter', async () => {
    const simAdapter = new SimulatedAdapter();
    simAdapter.events = [{ type: 'completed', runId: '' }];
    const opencode = new SimulatedAdapter();
    (opencode as unknown as { backendType: string }).backendType = BackendType.OPENCODE;

    const backendSelector = new BackendSelector([opencode, simAdapter]);
    const selectSpy = vi.spyOn(backendSelector, 'select');

    const policyMerger = new PolicyMerger();
    const runId = 'x';
    const mockRunStore = {
      create: vi.fn().mockReturnValue(makeRunRecord(runId, 'CREATED')),
      updateStatus: vi.fn((id: string, s: string) => makeRunRecord(id, s)),
      get: vi.fn().mockReturnValue(makeRunRecord(runId, 'COMPLETED')),
      list: vi.fn().mockReturnValue([]),
    } as unknown as RunStore;
    const mockCheckpointStore = { save: vi.fn(), load: vi.fn(), listForRun: vi.fn() } as unknown as CheckpointStore;
    const mockAgentMemory = { set: vi.fn(), get: vi.fn(), getAll: vi.fn(), delete: vi.fn() } as unknown as AgentMemoryStore;
    const mockArtifactStore = { list: vi.fn().mockReturnValue([]), write: vi.fn(), read: vi.fn(), getDir: vi.fn() } as unknown as ArtifactStore;
    const manifest = makeManifest();
    const mockRegistry = {
      info: vi.fn().mockReturnValue({ name: 'test-pkg', version: '1.0.0', manifest, signature: '', tarballPath: '', publishedAt: '' }),
      close: vi.fn(),
    } as unknown as RegistryService;

    const broker = new RuntimeBroker(
      mockRunStore, mockCheckpointStore, mockAgentMemory, mockArtifactStore,
      policyMerger, mockRegistry, backendSelector, new RetryStrategy({ maxRetries: 0, delayMs: 0 }),
    );

    await broker.run({ packageName: 'test-pkg', backendPreference: BackendType.SIMULATED });
    expect(selectSpy).toHaveBeenCalledWith(BackendType.SIMULATED);
  });
});
