import type { BackendType, RunStatus } from '@spwnr/core-types';
import type { SubagentManifest } from '@spwnr/core-types';

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
  manifest: SubagentManifest;
  input: Record<string, unknown>;
  policy?: unknown;
  workDir: string;
}
