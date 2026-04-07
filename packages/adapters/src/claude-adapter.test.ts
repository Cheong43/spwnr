import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import { ErrorCodes } from '@orchex/core-types';
import type { AdapterEvent } from '@orchex/broker';

vi.mock('child_process', () => ({
  execFileSync: vi.fn(),
  spawn: vi.fn(),
}));

import { execFileSync, spawn } from 'child_process';
import { ClaudeAdapter } from './claude-adapter.js';

const baseOpts = {
  runId: 'claude-run-1',
  manifest: { name: 'test', version: '1.0.0', tools: [] } as any,
  input: {},
  policy: { allowedTools: [], deniedTools: [], maxRetries: 0, timeoutMs: 5000, requiresApproval: false, rawDecisions: {} },
  workDir: '/workspace',
};

function makeChildProcess(exitCode: number, error?: Error) {
  const child = new EventEmitter();
  if (error) {
    setImmediate(() => child.emit('error', error));
  } else {
    setImmediate(() => child.emit('close', exitCode));
  }
  return child;
}

describe('ClaudeAdapter', () => {
  let adapter: ClaudeAdapter;

  beforeEach(() => {
    vi.mocked(execFileSync).mockReset();
    vi.mocked(spawn).mockReset();
    adapter = new ClaudeAdapter();
  });

  it('isAvailable() returns false when `which claude` fails', async () => {
    vi.mocked(execFileSync).mockImplementation(() => { throw new Error('not found'); });
    expect(await adapter.isAvailable()).toBe(false);
  });

  it('isAvailable() returns true when `which claude` succeeds', async () => {
    vi.mocked(execFileSync).mockReturnValue(Buffer.from('/usr/local/bin/claude'));
    expect(await adapter.isAvailable()).toBe(true);
  });

  it('run() throws BACKEND_UNAVAILABLE when not available', async () => {
    vi.mocked(execFileSync).mockImplementation(() => { throw new Error('not found'); });
    const iter = adapter.run(baseOpts);
    await expect(iter.next()).rejects.toMatchObject({ code: ErrorCodes.BACKEND_UNAVAILABLE });
  });

  it('run() yields started as first event when available', async () => {
    vi.mocked(execFileSync).mockReturnValue(Buffer.from('/usr/local/bin/claude'));
    vi.mocked(spawn).mockReturnValue(makeChildProcess(0) as any);
    const iter = adapter.run(baseOpts);
    const first = await iter.next();
    expect(first.value?.type).toBe('started');
  });

  it('run() yields completed when spawn exits with code 0', async () => {
    vi.mocked(execFileSync).mockReturnValue(Buffer.from('/usr/bin/claude'));
    vi.mocked(spawn).mockReturnValue(makeChildProcess(0) as any);
    const events: AdapterEvent[] = [];
    for await (const e of adapter.run(baseOpts)) events.push(e);
    expect(events.map(e => e.type)).toEqual(['started', 'completed']);
  });

  it('run() yields failed when spawn exits with non-zero code', async () => {
    vi.mocked(execFileSync).mockReturnValue(Buffer.from('/usr/bin/claude'));
    vi.mocked(spawn).mockReturnValue(makeChildProcess(1) as any);
    const events: AdapterEvent[] = [];
    for await (const e of adapter.run(baseOpts)) events.push(e);
    expect(events.map(e => e.type)).toEqual(['started', 'failed']);
  });
});
