export const ErrorCodes = {
  MANIFEST_INVALID: 'MANIFEST_INVALID',
  WORKFLOW_INVALID: 'WORKFLOW_INVALID',
  PACKAGE_NOT_FOUND: 'PACKAGE_NOT_FOUND',
  BACKEND_UNAVAILABLE: 'BACKEND_UNAVAILABLE',
  POLICY_DENIED: 'POLICY_DENIED',
  APPROVAL_REQUIRED: 'APPROVAL_REQUIRED',
  RUN_NOT_FOUND: 'RUN_NOT_FOUND',
  RUN_ALREADY_FINISHED: 'RUN_ALREADY_FINISHED',
  ADAPTER_PROTOCOL_ERROR: 'ADAPTER_PROTOCOL_ERROR',
  OUTPUT_SCHEMA_INVALID: 'OUTPUT_SCHEMA_INVALID',
  SIGNATURE_INVALID: 'SIGNATURE_INVALID',
  VERSION_CONFLICT: 'VERSION_CONFLICT',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export class OrchexError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'OrchexError';
  }
}
