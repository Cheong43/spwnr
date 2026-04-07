import type { BackendType, RunStatus, EventType } from './enums.js';

export interface RunRecord {
  runId: string;
  subagentName: string;
  subagentVersion: string;
  backend: BackendType;
  modelProvider?: string;
  modelName?: string;
  billingMode?: 'passthrough' | 'bundled' | 'metered';
  status: RunStatus;
  traceId: string;
  input: unknown;
  output?: unknown;
  errorCode?: string;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
}

export interface CheckpointRecord {
  checkpointId: string;
  runId: string;
  workflowStep: string;
  state: Record<string, unknown>;
  createdAt: string;
}

export interface RunEvent {
  eventId: string;
  runId: string;
  traceId: string;
  type: EventType;
  backend?: BackendType;
  ts: string;
  payload: Record<string, unknown>;
}
