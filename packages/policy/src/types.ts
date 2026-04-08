import type { HostType, SubagentManifest } from '@spwnr/core-types';
import type { PolicyRule } from '@spwnr/core-types';

export interface PolicyContext {
  host: HostType;
  manifest: SubagentManifest;
  mode: 'static' | 'session';
}

export interface PolicyExtension {
  readonly name: string;
  apply(context: PolicyContext): void | Promise<void>;
}

export interface PolicyInput {
  packagePolicy: PolicyRule[];
  orgPolicy?: PolicyRule[];
  requestPolicy?: PolicyRule[];
}

export interface EffectivePolicy {
  allowedTools: string[];
  deniedTools: string[];
  maxRetries: number;
  timeoutMs: number;
  requiresApproval: boolean;
  rawDecisions: Record<string, string>;
}
