import type { BackendAdapter, BackendAdapterRunOptions, AdapterEvent } from '@orchex/broker';
import { BackendType } from '@orchex/core-types';

export interface SimulatedAdapterOptions {
  available?: boolean;
  events?: Partial<AdapterEvent>[];
  delayMs?: number;
}

export class SimulatedAdapter implements BackendAdapter {
  readonly backendType = BackendType.SIMULATED;

  constructor(private options: SimulatedAdapterOptions = {}) {}

  async isAvailable(): Promise<boolean> {
    return this.options.available ?? true;
  }

  async *run(opts: BackendAdapterRunOptions): AsyncIterableIterator<AdapterEvent> {
    const events = this.options.events ?? [
      { type: 'started' },
      { type: 'completed' },
    ];
    for (const event of events) {
      if (this.options.delayMs) {
        await new Promise(r => setTimeout(r, this.options.delayMs));
      }
      yield { type: event.type!, runId: opts.runId, data: event.data };
    }
  }
}
