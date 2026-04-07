import { OrchexError, ErrorCodes } from '@orchex/core-types';
import type { BackendType } from '@orchex/core-types';
import type { BackendAdapter } from './types.js';

export class BackendSelector {
  constructor(private adapters: BackendAdapter[]) {}

  async select(preference?: BackendType): Promise<BackendAdapter> {
    if (preference) {
      const preferred = this.adapters.find(a => a.backendType === preference);
      if (preferred && await preferred.isAvailable()) return preferred;
    }
    for (const adapter of this.adapters) {
      if (await adapter.isAvailable()) return adapter;
    }
    throw new OrchexError(ErrorCodes.BACKEND_UNAVAILABLE, 'No available backend adapter');
  }
}
