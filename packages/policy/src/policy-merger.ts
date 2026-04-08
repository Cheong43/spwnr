import type { PolicyContext, PolicyExtension, EffectivePolicy, PolicyInput } from './types.js';

export class NoopPolicyProvider {
  private readonly extensions: PolicyExtension[];

  constructor(extensions: PolicyExtension[] = []) {
    this.extensions = extensions;
  }

  getExtensions(): PolicyExtension[] {
    return [...this.extensions];
  }

  async apply(context: PolicyContext): Promise<void> {
    for (const extension of this.extensions) {
      await extension.apply(context);
    }
  }
}

export class PolicyMerger extends NoopPolicyProvider {
  loadOrgPolicy(): [] {
    return [];
  }

  merge(_input: PolicyInput): EffectivePolicy {
    return {
      allowedTools: [],
      deniedTools: [],
      maxRetries: 0,
      timeoutMs: 0,
      requiresApproval: false,
      rawDecisions: {},
    };
  }
}
