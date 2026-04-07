import { describe, it, expect } from 'vitest';
import type { BackendType, RunStatus } from './enums.js';
import { ErrorCodes, OrchexError } from './errors.js';
import type { SubagentManifest } from './manifest.js';

describe('BackendType', () => {
  it('should accept all valid backend types', () => {
    const backends: BackendType[] = ['opencode', 'claude_code', 'openclaw', 'codex', 'cline', 'simulated'];
    expect(backends).toHaveLength(6);
    expect(backends).toContain('opencode');
    expect(backends).toContain('claude_code');
    expect(backends).toContain('openclaw');
    expect(backends).toContain('codex');
    expect(backends).toContain('cline');
    expect(backends).toContain('simulated');
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

describe('OrchexError', () => {
  it('should extend Error', () => {
    const error = new OrchexError('MANIFEST_INVALID', 'Test error');
    expect(error).toBeInstanceOf(Error);
  });

  it('should have code and details fields', () => {
    const details = { field: 'test' };
    const error = new OrchexError('MANIFEST_INVALID', 'Test error', details);
    expect(error.code).toBe('MANIFEST_INVALID');
    expect(error.details).toEqual(details);
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('OrchexError');
  });

  it('should work without details', () => {
    const error = new OrchexError('POLICY_DENIED', 'Access denied');
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
      apiVersion: 'v1',
      kind: 'Subagent',
      metadata: {
        name: 'test-agent',
        version: '1.0.0',
      },
      spec: {
        input: { schema: 'string' },
        output: { schema: 'string' },
        workflow: {
          entry: 'start',
        },
      },
    };
    
    expect(manifest.apiVersion).toBe('v1');
    expect(manifest.kind).toBe('Subagent');
    expect(manifest.metadata.name).toBe('test-agent');
    expect(manifest.metadata.version).toBe('1.0.0');
    expect(manifest.spec.input.schema).toBe('string');
    expect(manifest.spec.output.schema).toBe('string');
    expect(manifest.spec.workflow.entry).toBe('start');
  });

  it('should support optional fields in manifest', () => {
    const manifest: SubagentManifest = {
      apiVersion: 'v1',
      kind: 'Subagent',
      metadata: {
        name: 'test-agent',
        version: '1.0.0',
        description: 'A test agent',
        tags: ['test', 'demo'],
      },
      spec: {
        persona: {
          role: 'assistant',
          tone: 'professional',
          style: 'concise',
        },
        input: { schema: 'string' },
        output: { schema: 'string' },
        workflow: {
          entry: 'start',
          steps: [
            {
              id: 'step1',
              type: 'action',
              tool: 'test-tool',
            },
          ],
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
    expect(manifest.spec.workflow.steps).toHaveLength(1);
    expect(manifest.spec.compatibility?.hosts).toContain('opencode');
  });
});
