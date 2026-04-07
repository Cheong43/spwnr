import type { BackendType, RunStatus } from '@orchex/core-types';
import type { EffectivePolicy } from '@orchex/policy';

export interface BrokerRunOptions {
  packageName: string;
  version?: string;
  input?: Record<string, unknown>;
  backendPreference?: BackendType;
  orgPolicyPath?: string;
}

export interface RunResult {
  runId: string;
  status: RunStatus;
  artifacts: string[];
  error?: string;
}

export interface AdapterEvent {
  type: 'started' | 'checkpoint' | 'completed' | 'failed';
  runId: string;
  data?: unknown;
}

export interface BackendAdapter {
  readonly backendType: BackendType;
  isAvailable(): Promise<boolean>;
  run(options: BackendAdapterRunOptions): AsyncIterableIterator<AdapterEvent>;
}

export interface BackendAdapterRunOptions {
  runId: string;
  manifest: import('@orchex/core-types').SubagentManifest;
  input: Record<string, unknown>;
  policy: EffectivePolicy;
  workDir: string;
}
