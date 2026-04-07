import { describe, it, expect } from 'vitest';
import { AdapterRegistry } from './adapter-registry.js';
import { SimulatedAdapter } from './simulated-adapter.js';
import { BackendType } from '@orchex/core-types';

describe('AdapterRegistry', () => {
  it('register() stores adapter', () => {
    const registry = new AdapterRegistry();
    const adapter = new SimulatedAdapter();
    registry.register(adapter);
    expect(registry.get(BackendType.SIMULATED)).toBe(adapter);
  });

  it('get() retrieves adapter by BackendType', () => {
    const registry = new AdapterRegistry();
    const adapter = new SimulatedAdapter();
    registry.register(adapter);
    const retrieved = registry.get(BackendType.SIMULATED);
    expect(retrieved).toBe(adapter);
    expect(retrieved?.backendType).toBe('simulated');
  });

  it('has() returns true for registered and false for unregistered', () => {
    const registry = new AdapterRegistry();
    const adapter = new SimulatedAdapter();
    registry.register(adapter);
    expect(registry.has(BackendType.SIMULATED)).toBe(true);
    expect(registry.has(BackendType.OPENCODE)).toBe(false);
  });

  it('getAll() returns all registered adapters', () => {
    const registry = new AdapterRegistry();
    const simulated = new SimulatedAdapter();
    registry.register(simulated);
    const all = registry.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toBe(simulated);
  });
});
