import { spawnSync, execFileSync } from 'child_process';
import type { BackendAdapter, BackendAdapterRunOptions, AdapterEvent } from '@orchex/broker';
import { BackendType, OrchexError, ErrorCodes } from '@orchex/core-types';

export class OpenCodeAdapter implements BackendAdapter {
  readonly backendType = BackendType.OPENCODE;

  async isAvailable(): Promise<boolean> {
    try {
      execFileSync('which', ['opencode'], { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  async *run(opts: BackendAdapterRunOptions): AsyncIterableIterator<AdapterEvent> {
    if (!await this.isAvailable()) {
      throw new OrchexError(ErrorCodes.BACKEND_UNAVAILABLE, 'opencode CLI not found');
    }
    yield { type: 'started', runId: opts.runId };
    try {
      spawnSync('opencode', [
        'run',
        '--manifest', JSON.stringify(opts.manifest),
        '--input', JSON.stringify(opts.input),
        '--workdir', opts.workDir,
      ], { stdio: 'inherit' });
      yield { type: 'completed', runId: opts.runId };
    } catch (err) {
      yield { type: 'failed', runId: opts.runId, data: err instanceof Error ? err.message : String(err) };
    }
  }
}
