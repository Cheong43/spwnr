import { describe, expect, it } from 'vitest';
import { validateManifest } from './manifest-validator.js';

const minimalManifest = {
  apiVersion: 'subagent.io/v0.2',
  kind: 'Subagent',
  metadata: {
    name: 'test-agent',
    version: '0.1.0',
    instruction: 'Review code changes carefully.',
  },
  spec: {
    agent: { path: './agent.md' },
    schemas: {
      input: './schemas/input.schema.json',
      output: './schemas/output.schema.json',
    },
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
      metadata: {
        ...minimalManifest.metadata,
        authors: [
          {
            name: 'Spwnr Team',
            github: 'spwnr',
            url: 'https://github.com/spwnr',
          },
        ],
        license: 'MIT',
        homepage: 'https://example.com/templates/code-reviewer',
        repository: 'https://github.com/example/code-reviewer',
      },
      spec: {
        ...minimalManifest.spec,
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
        dependencies: {
          packages: [
            {
              ecosystem: 'npm',
              name: 'gh',
              versionRange: '^2.0.0',
              reason: 'Used for PR review workflows',
            },
            {
              ecosystem: 'binary',
              name: 'git',
            },
          ],
        },
      },
    };

    const result = validateManifest(fullManifest);
    expect(result.success).toBe(true);
  });

  it('fails when metadata.instruction is missing', () => {
    const result = validateManifest({
      ...minimalManifest,
      metadata: {
        name: 'test-agent',
        version: '0.1.0',
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((error) => error.path.includes('instruction'))).toBe(true);
    }
  });

  it('fails when spec.agent.path is missing', () => {
    const result = validateManifest({
      ...minimalManifest,
      spec: {
        schemas: {
          input: './schemas/input.schema.json',
        },
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((error) => error.path.includes('agent'))).toBe(true);
    }
  });

  it('fails when metadata.instruction exceeds 400 Unicode characters', () => {
    const result = validateManifest({
      ...minimalManifest,
      metadata: {
        ...minimalManifest.metadata,
        instruction: '你'.repeat(401),
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((error) => error.message.includes('400 characters or fewer'))).toBe(true);
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

  it('fails when a dependency ecosystem is unsupported', () => {
    const result = validateManifest({
      ...minimalManifest,
      spec: {
        ...minimalManifest.spec,
        dependencies: {
          packages: [
            {
              ecosystem: 'rubygems',
              name: 'octokit',
            },
          ],
        },
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((error) => error.path.includes('dependencies'))).toBe(true);
    }
  });

  it('fails when metadata authors contains an invalid homepage URL', () => {
    const result = validateManifest({
      ...minimalManifest,
      metadata: {
        ...minimalManifest.metadata,
        homepage: 'not-a-url',
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((error) => error.path.includes('homepage'))).toBe(true);
    }
  });
});
