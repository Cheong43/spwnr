import type { BackendAdapter } from '@orchex/broker';
import type { BackendType } from '@orchex/core-types';

export class AdapterRegistry {
  private adapters = new Map<BackendType, BackendAdapter>();

  register(adapter: BackendAdapter): void {
    this.adapters.set(adapter.backendType, adapter);
  }

  get(type: BackendType): BackendAdapter | undefined {
    return this.adapters.get(type);
  }

  getAll(): BackendAdapter[] {
    return [...this.adapters.values()];
  }

  has(type: BackendType): boolean {
    return this.adapters.has(type);
  }
}
