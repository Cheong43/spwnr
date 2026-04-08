import type { HostType } from '@spwnr/core-types';
import type { HostAdapter } from './host-adapter.js';

export class AdapterRegistry {
  private readonly adapters = new Map<HostType, HostAdapter>();

  register(adapter: HostAdapter): void {
    this.adapters.set(adapter.host, adapter);
  }

  get(host: HostType): HostAdapter | undefined {
    return this.adapters.get(host);
  }

  require(host: HostType): HostAdapter {
    const adapter = this.adapters.get(host);
    if (!adapter) {
      throw new Error(`No host adapter registered for ${host}`);
    }
    return adapter;
  }

  getAll(): HostAdapter[] {
    return [...this.adapters.values()];
  }
}
