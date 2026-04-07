import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorCodes } from '@orchex/core-types';

vi.mock('child_process', () => ({
  execFileSync: vi.fn(),
  spawnSync: vi.fn().mockReturnValue({ status: 0 }),
}));

import { execFileSync, spawnSync } from 'child_process';
import { ClaudeAdapter } from './claude-adapter.js';

const baseOpts = {
  runId: 'claude-run-1',
  manifest: { name: 'test', version: '1.0.0', tools: [] } as any,
  input: {},
  policy: { allowedTools: [], deniedTools: [], maxRetries: 0, timeoutMs: 5000, requiresApproval: false, rawDecisions: {} },
  workDir: '/workspace',
};

describe('ClaudeAdapter', () => {
  beforeEach(() => {
    vi.mocked(execFileSync).mockReset();
    vi.mocked(spawnSync).mockReturnValue({ status: 0 } as any);
  });

  it('isAvailable() returns false when `which claude` fails', async () => {
    vi.mocked(execFileSync).mockImplementation(() => { throw new Error('not found'); });
    const adapter = new ClaudeAdapter();
    expect(await adapter.isAvailable()).toBe(false);
  });

  it('isAvailable() returns true when `which claude` succeeds', async () => {
    vi.mocked(execFileSync).mockReturnValue(Buffer.from('/usr/local/bin/claude'));
    const adapter = new ClaudeAdapter();
    expect(await adapter.isAvailable()).toBe(true);
  });

  it('run() throws BACKEND_UNAVAILABLE when not available', async () => {
    vi.mocked(execFileSync).mockImplementation(() => { throw new Error('not found'); });
    const adapter = new ClaudeAdapter();
    const iter = adapter.run(baseOpts);
    await expect(iter.next()).rejects.toMatchObject({ code: ErrorCodes.BACKEND_UNAVAILABLE });
  });

  it('run() yields started as first event when available', async () => {
    vi.mocked(execFileSync).mockReturnValue(Buffer.from('/usr/local/bin/claude'));
    const adapter = new ClaudeAdapter();
    const iter = adapter.run(baseOpts);
    const first = await iter.next();
    expect(first.value?.type).toBe('started');
  });
});
