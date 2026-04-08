import { describe, it, expect } from 'vitest';
import { BackendSelector } from './backend-selector.js';
import { BackendType, SpwnrError, ErrorCodes } from '@spwnr/core-types';
import type { BackendAdapter, AdapterEvent, BackendAdapterRunOptions } from './types.js';

class MockAdapter implements BackendAdapter {
  constructor(
    public readonly backendType: BackendType,
    public available: boolean = true,
  ) {}

  async isAvailable(): Promise<boolean> {
    return this.available;
  }

  async *run(_opts: BackendAdapterRunOptions): AsyncIterableIterator<AdapterEvent> {
    // not used in selector tests
  }
}

describe('BackendSelector', () => {
  it('selects the preferred adapter when available', async () => {
    const simulated = new MockAdapter(BackendType.SIMULATED);
    const opencode = new MockAdapter(BackendType.OPENCODE);
    const selector = new BackendSelector([opencode, simulated]);

    const result = await selector.select(BackendType.SIMULATED);
    expect(result.backendType).toBe(BackendType.SIMULATED);
  });

  it('falls back to first available when preferred is unavailable', async () => {
    const unavailable = new MockAdapter(BackendType.SIMULATED, false);
    const fallback = new MockAdapter(BackendType.OPENCODE, true);
    const selector = new BackendSelector([fallback, unavailable]);

    const result = await selector.select(BackendType.SIMULATED);
    expect(result.backendType).toBe(BackendType.OPENCODE);
  });

  it('throws BACKEND_UNAVAILABLE when no adapters are available', async () => {
    const a = new MockAdapter(BackendType.SIMULATED, false);
    const b = new MockAdapter(BackendType.OPENCODE, false);
    const selector = new BackendSelector([a, b]);

    await expect(selector.select()).rejects.toMatchObject({
      code: ErrorCodes.BACKEND_UNAVAILABLE,
    });
  });

  it('throws BACKEND_UNAVAILABLE with no adapters at all', async () => {
    const selector = new BackendSelector([]);
    await expect(selector.select()).rejects.toBeInstanceOf(SpwnrError);
  });

  it('returns preferred adapter even when fallback is also available', async () => {
    const preferred = new MockAdapter(BackendType.SIMULATED, true);
    const fallback = new MockAdapter(BackendType.OPENCODE, true);
    const selector = new BackendSelector([fallback, preferred]);

    const result = await selector.select(BackendType.SIMULATED);
    expect(result.backendType).toBe(BackendType.SIMULATED);
  });

  it('selects first available when no preference given', async () => {
    const a = new MockAdapter(BackendType.OPENCODE, false);
    const b = new MockAdapter(BackendType.SIMULATED, true);
    const selector = new BackendSelector([a, b]);

    const result = await selector.select();
    expect(result.backendType).toBe(BackendType.SIMULATED);
  });
});
