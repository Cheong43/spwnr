import { describe, it, expect } from 'vitest';
import type { BackendType, HostType, RunStatus } from './enums.js';
import { BackendType as BackendTypes, HostType as HostTypes, HostScope } from './enums.js';
import { ErrorCodes, SpwnrError } from './errors.js';
import type { SubagentManifest } from './manifest.js';

describe('HostType', () => {
  it('accepts all supported host targets', () => {
    const hosts: HostType[] = ['claude_code', 'codex', 'copilot', 'opencode'];
    expect(hosts).toHaveLength(4);
    expect(hosts).toEqual(Object.values(HostTypes));
  });
});

describe('BackendType', () => {
  it('keeps legacy runtime values for deprecated internal packages', () => {
    const backends: BackendType[] = ['opencode', 'claude_code', 'openclaw', 'codex', 'cline', 'simulated', 'copilot'];
    expect([...backends].sort()).toEqual([...Object.values(BackendTypes)].sort());
  });
});

describe('HostScope', () => {
  it('supports project and user scopes', () => {
    expect(Object.values(HostScope)).toEqual(['project', 'user']);
  });
});

describe('RunStatus', () => {
  it('should accept CREATED, RUNNING, COMPLETED, FAILED as valid values', () => {
    const statuses: RunStatus[] = ['CREATED', 'RUNNING', 'COMPLETED', 'FAILED'];
    expect(statuses).toHaveLength(4);
    expect(statuses).toContain('CREATED');
    expect(statuses).toContain('RUNNING');
    expect(statuses).toContain('COMPLETED');
    expect(statuses).toContain('FAILED');
  });
});

describe('SpwnrError', () => {
  it('should extend Error', () => {
    const error = new SpwnrError('MANIFEST_INVALID', 'Test error');
    expect(error).toBeInstanceOf(Error);
  });

  it('should have code and details fields', () => {
    const details = { field: 'test' };
    const error = new SpwnrError('MANIFEST_INVALID', 'Test error', details);
    expect(error.code).toBe('MANIFEST_INVALID');
    expect(error.details).toEqual(details);
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('SpwnrError');
  });

  it('should work without details', () => {
    const error = new SpwnrError('POLICY_DENIED', 'Access denied');
    expect(error.code).toBe('POLICY_DENIED');
    expect(error.details).toBeUndefined();
  });
});

describe('ErrorCodes', () => {
  it('should have all 15 error code keys', () => {
    const keys = Object.keys(ErrorCodes);
    expect(keys).toHaveLength(16);
    expect(keys).toContain('MANIFEST_INVALID');
    expect(keys).toContain('WORKFLOW_INVALID');
    expect(keys).toContain('PACKAGE_NOT_FOUND');
    expect(keys).toContain('BACKEND_UNAVAILABLE');
    expect(keys).toContain('POLICY_DENIED');
    expect(keys).toContain('APPROVAL_REQUIRED');
    expect(keys).toContain('APPROVAL_TIMEOUT');
    expect(keys).toContain('RUN_NOT_FOUND');
    expect(keys).toContain('RUN_ALREADY_FINISHED');
    expect(keys).toContain('RUN_ALREADY_COMPLETED');
    expect(keys).toContain('INPUT_INVALID');
    expect(keys).toContain('ADAPTER_PROTOCOL_ERROR');
    expect(keys).toContain('OUTPUT_SCHEMA_INVALID');
    expect(keys).toContain('SIGNATURE_INVALID');
    expect(keys).toContain('VERSION_CONFLICT');
    expect(keys).toContain('INTERNAL_ERROR');
  });
});

describe('SubagentManifest', () => {
  it('should compile with all required fields', () => {
    const manifest: SubagentManifest = {
      apiVersion: 'spwnr/v1',
      kind: 'Subagent',
      metadata: {
        name: 'test-agent',
        version: '1.0.0',
        instruction: 'Review code changes carefully.',
      },
      spec: {
        agent: {
          path: './agent.md',
        },
        schemas: {
          input: './schemas/input.schema.json',
          output: './schemas/output.schema.json',
        },
      },
    };
    
    expect(manifest.apiVersion).toBe('spwnr/v1');
    expect(manifest.kind).toBe('Subagent');
    expect(manifest.metadata.name).toBe('test-agent');
    expect(manifest.metadata.version).toBe('1.0.0');
    expect(manifest.metadata.instruction).toBe('Review code changes carefully.');
    expect(manifest.spec.agent.path).toBe('./agent.md');
    expect(manifest.spec.schemas?.input).toBe('./schemas/input.schema.json');
    expect(manifest.spec.schemas?.output).toBe('./schemas/output.schema.json');
  });

  it('should support optional fields in manifest', () => {
    const manifest: SubagentManifest = {
      apiVersion: 'spwnr/v1',
      kind: 'Subagent',
      metadata: {
        name: 'test-agent',
        version: '1.0.0',
        instruction: 'Handle repository navigation tasks.',
        description: 'A test agent',
        tags: ['test', 'demo'],
      },
      spec: {
        persona: {
          role: 'assistant',
          tone: 'professional',
          style: 'concise',
        },
        agent: {
          path: './agent.md',
        },
        schemas: {
          input: './schemas/input.schema.json',
          output: './schemas/output.schema.json',
        },
        injection: {
          hosts: {
            claude_code: {
              static: {
                enabled: true,
                defaultScope: 'project',
              },
              session: {
                enabled: true,
                defaultScope: 'user',
              },
            },
          },
        },
        compatibility: {
          hosts: ['opencode', 'claude_code'],
          mode: 'single_host',
        },
      },
    };

    expect(manifest.metadata.description).toBe('A test agent');
    expect(manifest.metadata.tags).toEqual(['test', 'demo']);
    expect(manifest.spec.persona?.role).toBe('assistant');
    expect(manifest.spec.injection?.hosts?.claude_code?.static?.defaultScope).toBe('project');
    expect(manifest.spec.compatibility?.hosts).toContain('opencode');
  });
});
