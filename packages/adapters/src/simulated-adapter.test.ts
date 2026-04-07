import { describe, it, expect } from 'vitest';
import { SimulatedAdapter } from './simulated-adapter.js';
import type { BackendAdapter } from '@orchex/broker';
import { BackendType } from '@orchex/core-types';

const baseOpts = {
  runId: 'test-run-1',
  manifest: { name: 'test', version: '1.0.0', tools: [] } as any,
  input: {},
  policy: { allowedTools: [], deniedTools: [], maxRetries: 0, timeoutMs: 5000, requiresApproval: false, rawDecisions: {} },
  workDir: '/tmp',
};

describe('SimulatedAdapter', () => {
  it('isAvailable() returns true by default', async () => {
    const adapter = new SimulatedAdapter();
    expect(await adapter.isAvailable()).toBe(true);
  });

  it('isAvailable() returns false when available:false', async () => {
    const adapter = new SimulatedAdapter({ available: false });
    expect(await adapter.isAvailable()).toBe(false);
  });

  it('run() emits default started+completed events when no events configured', async () => {
    const adapter = new SimulatedAdapter();
    const events = [];
    for await (const event of adapter.run(baseOpts)) {
      events.push(event);
    }
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('started');
    expect(events[1].type).toBe('completed');
  });

  it('run() emits custom events in order', async () => {
    const adapter = new SimulatedAdapter({
      events: [
        { type: 'started' },
        { type: 'checkpoint', data: 'step 1' },
        { type: 'completed' },
      ],
    });
    const events = [];
    for await (const event of adapter.run(baseOpts)) {
      events.push(event);
    }
    expect(events.map(e => e.type)).toEqual(['started', 'checkpoint', 'completed']);
  });

  it('run() attaches correct runId to all events', async () => {
    const adapter = new SimulatedAdapter();
    for await (const event of adapter.run(baseOpts)) {
      expect(event.runId).toBe('test-run-1');
    }
  });

  it('run() emits checkpoint event with data', async () => {
    const adapter = new SimulatedAdapter({
      events: [{ type: 'checkpoint', data: { step: 'build' } }],
    });
    const events = [];
    for await (const event of adapter.run(baseOpts)) {
      events.push(event);
    }
    expect(events[0].type).toBe('checkpoint');
    expect(events[0].data).toEqual({ step: 'build' });
  });

  it('run() emits failed event with error data', async () => {
    const adapter = new SimulatedAdapter({
      events: [{ type: 'failed', data: 'something went wrong' }],
    });
    const events = [];
    for await (const event of adapter.run(baseOpts)) {
      events.push(event);
    }
    expect(events[0].type).toBe('failed');
    expect(events[0].data).toBe('something went wrong');
  });

  it('SimulatedAdapter can be used as BackendAdapter (type compatibility)', () => {
    const adapter: BackendAdapter = new SimulatedAdapter();
    expect(adapter.backendType).toBe(BackendType.SIMULATED);
    expect(typeof adapter.isAvailable).toBe('function');
    expect(typeof adapter.run).toBe('function');
  });

  it('backendType is simulated', () => {
    const adapter = new SimulatedAdapter();
    expect(adapter.backendType).toBe('simulated');
  });
});
