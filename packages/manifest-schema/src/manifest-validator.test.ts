import { describe, expect, it } from 'vitest';
import { validateManifest } from './manifest-validator.js';

const minimalManifest = {
  apiVersion: 'subagent.io/v0.1',
  kind: 'Subagent',
  metadata: { name: 'test-agent', version: '0.1.0' },
  spec: {
    instructions: { system: './prompts/system.md' },
    input: { schema: './schemas/input.schema.json' },
    output: { schema: './schemas/output.schema.json' },
  },
};

describe('ManifestValidator', () => {
  it('validates a prompt-first minimal manifest', () => {
    const result = validateManifest(minimalManifest);
    expect(result.success).toBe(true);
  });

  it('validates a full manifest with injection metadata', () => {
    const fullManifest = {
      ...minimalManifest,
      spec: {
        ...minimalManifest.spec,
        workflow: {
          entry: 'main',
          steps: [{ id: 'step-1', type: 'prompt', prompt: 'Hello' }],
        },
        compatibility: {
          hosts: ['claude_code', 'codex', 'copilot', 'opencode'],
          mode: 'cross_host',
        },
        injection: {
          hosts: {
            claude_code: {
              static: { enabled: true, defaultScope: 'project' },
              session: { enabled: true, defaultScope: 'user' },
            },
            codex: {
              static: { enabled: true },
              session: { enabled: true, defaultScope: 'project' },
            },
          },
        },
        modelBinding: {
          mode: 'injectable',
          defaultProvider: 'openai',
          defaultModel: 'gpt-5.4',
          allowOverride: true,
        },
      },
    };

    const result = validateManifest(fullManifest);
    expect(result.success).toBe(true);
  });

  it('fails when instructions.system is missing', () => {
    const result = validateManifest({
      ...minimalManifest,
      spec: {
        input: { schema: './schemas/input.schema.json' },
        output: { schema: './schemas/output.schema.json' },
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((error) => error.path.includes('instructions'))).toBe(true);
    }
  });

  it('fails when compatibility contains a runtime-only host', () => {
    const result = validateManifest({
      ...minimalManifest,
      spec: {
        ...minimalManifest.spec,
        compatibility: {
          hosts: ['simulated'],
        },
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((error) => error.path.includes('hosts'))).toBe(true);
    }
  });

  it('fails when injection defaultScope is invalid', () => {
    const result = validateManifest({
      ...minimalManifest,
      spec: {
        ...minimalManifest.spec,
        injection: {
          hosts: {
            copilot: {
              static: {
                enabled: true,
                defaultScope: 'workspace',
              },
            },
          },
        },
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((error) => error.path.includes('defaultScope'))).toBe(true);
    }
  });
});
