export const BackendType = {
  OPENCODE: 'opencode',
  CLAUDE_CODE: 'claude_code',
  OPENCLAW: 'openclaw',
  CODEX: 'codex',
  CLINE: 'cline',
  SIMULATED: 'simulated',
} as const;
export type BackendType = (typeof BackendType)[keyof typeof BackendType];

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
