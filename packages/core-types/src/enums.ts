export const HostType = {
  CLAUDE_CODE: 'claude_code',
  CODEX: 'codex',
  COPILOT: 'copilot',
  OPENCODE: 'opencode',
} as const;
export type HostType = (typeof HostType)[keyof typeof HostType];

export const LegacyRuntimeType = {
  OPENCLAW: 'openclaw',
  CLINE: 'cline',
  SIMULATED: 'simulated',
} as const;
export type LegacyRuntimeType = (typeof LegacyRuntimeType)[keyof typeof LegacyRuntimeType];

/**
 * @deprecated Use HostType for all public manifest and injection flows.
 * BackendType is kept only so deprecated internal runtime packages still compile.
 */
export const BackendType = {
  ...HostType,
  ...LegacyRuntimeType,
} as const;
export type BackendType = (typeof BackendType)[keyof typeof BackendType];

export const HostScope = {
  PROJECT: 'project',
  USER: 'user',
} as const;
export type HostScope = (typeof HostScope)[keyof typeof HostScope];

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
