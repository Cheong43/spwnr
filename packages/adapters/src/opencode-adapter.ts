import { spawn, execFileSync } from 'child_process';
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
      await new Promise<void>((resolve, reject) => {
        const child = spawn('opencode', [
          'run',
          '--manifest', JSON.stringify(opts.manifest),
          '--input', JSON.stringify(opts.input),
          '--workdir', opts.workDir,
        ], { stdio: 'inherit' });
        child.on('error', reject);
        child.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`opencode exited with status ${code}`));
        });
      });
      yield { type: 'completed', runId: opts.runId };
    } catch (err) {
      yield { type: 'failed', runId: opts.runId, data: err instanceof Error ? err.message : String(err) };
    }
  }
}
