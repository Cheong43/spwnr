export type BackendType = 'opencode' | 'claude_code' | 'openclaw' | 'codex' | 'cline';

export type PolicyDecision = 'allow' | 'ask' | 'deny';

export type RunStatus =
  | 'CREATED'
  | 'VALIDATED'
  | 'COMPILED'
  | 'SCHEDULED'
  | 'RUNNING'
  | 'WAITING_APPROVAL'
  | 'RETRYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type EventType =
  | 'run.created'
  | 'run.started'
  | 'run.completed'
  | 'run.failed'
  | 'tool.started'
  | 'tool.finished'
  | 'approval.requested'
  | 'approval.resolved'
  | 'artifact.emitted'
  | 'step.started'
  | 'step.finished';
