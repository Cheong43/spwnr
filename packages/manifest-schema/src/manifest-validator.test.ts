import { describe, it, expect } from 'vitest';
import { validateManifest } from './manifest-validator';

const minimalManifest = {
  apiVersion: 'subagent.io/v0.1',
  kind: 'Subagent',
  metadata: { name: 'test-agent', version: '0.1.0' },
  spec: {
    input: { schema: './schemas/input.schema.json' },
    output: { schema: './schemas/output.schema.json' },
    workflow: { entry: 'main' },
  },
};

describe('ManifestValidator', () => {
  describe('Valid manifests', () => {
    it('should validate a minimal manifest with only required fields', () => {
      const result = validateManifest(minimalManifest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.apiVersion).toBe('subagent.io/v0.1');
        expect(result.data.kind).toBe('Subagent');
        expect(result.data.metadata.name).toBe('test-agent');
        expect(result.data.metadata.version).toBe('0.1.0');
      }
    });

    it('should validate a full manifest with all optional fields', () => {
      const fullManifest = {
        apiVersion: 'subagent.io/v0.1',
        kind: 'Subagent',
        metadata: {
          name: 'full-agent',
          version: '1.2.3',
          description: 'A full featured agent',
          tags: ['test', 'demo'],
        },
        spec: {
          persona: {
            role: 'helpful assistant',
            tone: 'friendly',
            style: 'concise',
          },
          input: { schema: './schemas/input.schema.json' },
          output: { schema: './schemas/output.schema.json' },
          workflow: {
            entry: 'main',
            steps: [
              {
                id: 'step1',
                type: 'prompt',
                prompt: 'Hello',
                next: 'step2',
              },
            ],
          },
          skills: {
            refs: [
              { name: 'skill1', path: './skills/skill1', version: '1.0.0' },
            ],
          },
          tools: {
            allow: ['grep', 'view'],
            ask: ['bash'],
            deny: ['rm'],
          },
          permissions: {
            filesystem: [
              { pattern: '/home/*', decision: 'allow' },
            ],
          },
          memory: {
            scope: 'run',
            schema: './schemas/memory.schema.json',
          },
          compatibility: {
            hosts: ['opencode', 'claude_code'],
            mode: 'cross_host',
            minVersions: { opencode: '1.0.0' },
            badges: ['verified'],
          },
          artifacts: ['output.json', 'report.md'],
          modelBinding: {
            mode: 'injectable',
            defaultProvider: 'openai',
            defaultModel: 'gpt-4',
            allowOverride: true,
            endpointRef: null,
            authRef: null,
            billing: {
              mode: 'passthrough',
              sku: 'premium',
            },
          },
        },
      };

      const result = validateManifest(fullManifest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata.name).toBe('full-agent');
        expect(result.data.spec.persona?.role).toBe('helpful assistant');
        expect(result.data.spec.memory?.scope).toBe('run');
        expect(result.data.spec.compatibility?.hosts).toContain('opencode');
        expect(result.data.spec.modelBinding?.mode).toBe('injectable');
      }
    });
  });

  describe('Invalid manifests - required fields', () => {
    it('should fail when apiVersion is missing', () => {
      const invalid = { ...minimalManifest };
      delete (invalid as any).apiVersion;
      
      const result = validateManifest(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some(e => e.path === 'apiVersion')).toBe(true);
      }
    });

    it('should fail when kind is not "Subagent"', () => {
      const invalid = { ...minimalManifest, kind: 'Plugin' };
      
      const result = validateManifest(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some(e => e.path === 'kind')).toBe(true);
      }
    });

    it('should fail when metadata.name is empty', () => {
      const invalid = {
        ...minimalManifest,
        metadata: { ...minimalManifest.metadata, name: '' },
      };
      
      const result = validateManifest(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some(e => e.path.includes('name'))).toBe(true);
      }
    });

    it('should fail when spec.input is missing', () => {
      const invalid = {
        ...minimalManifest,
        spec: { ...minimalManifest.spec },
      };
      delete (invalid.spec as any).input;
      
      const result = validateManifest(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some(e => e.path.includes('input'))).toBe(true);
      }
    });

    it('should fail when spec.output is missing', () => {
      const invalid = {
        ...minimalManifest,
        spec: { ...minimalManifest.spec },
      };
      delete (invalid.spec as any).output;
      
      const result = validateManifest(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some(e => e.path.includes('output'))).toBe(true);
      }
    });

    it('should fail when spec.workflow.entry is missing', () => {
      const invalid = {
        ...minimalManifest,
        spec: {
          ...minimalManifest.spec,
          workflow: {},
        },
      };
      
      const result = validateManifest(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some(e => e.path.includes('entry'))).toBe(true);
      }
    });
  });

  describe('Invalid manifests - version format', () => {
    it('should fail when version is not semver (x.y.z)', () => {
      const invalid = {
        ...minimalManifest,
        metadata: { ...minimalManifest.metadata, version: '1.0' },
      };
      
      const result = validateManifest(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some(e => e.path.includes('version'))).toBe(true);
      }
    });

    it('should fail when version is completely invalid', () => {
      const invalid = {
        ...minimalManifest,
        metadata: { ...minimalManifest.metadata, version: 'abc' },
      };
      
      const result = validateManifest(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some(e => e.path.includes('version'))).toBe(true);
      }
    });
  });

  describe('Invalid manifests - enum validation', () => {
    it('should fail when BackendType is invalid', () => {
      const invalid = {
        ...minimalManifest,
        spec: {
          ...minimalManifest.spec,
          compatibility: {
            hosts: ['unknown-host'],
          },
        },
      };
      
      const result = validateManifest(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some(e => e.path.includes('hosts'))).toBe(true);
      }
    });

    it('should fail when memory.scope is invalid', () => {
      const invalid = {
        ...minimalManifest,
        spec: {
          ...minimalManifest.spec,
          memory: {
            scope: 'global',
          },
        },
      };
      
      const result = validateManifest(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some(e => e.path.includes('scope'))).toBe(true);
      }
    });

    it('should fail when modelBinding.mode is invalid', () => {
      const invalid = {
        ...minimalManifest,
        spec: {
          ...minimalManifest.spec,
          modelBinding: {
            mode: 'other',
          },
        },
      };
      
      const result = validateManifest(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some(e => e.path.includes('mode'))).toBe(true);
      }
    });
  });

  describe('Error paths', () => {
    it('should provide correct error path for nested fields', () => {
      const invalid = {
        ...minimalManifest,
        spec: {
          ...minimalManifest.spec,
          persona: {
            role: 123, // should be string
          },
        },
      };
      
      const result = validateManifest(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some(e => e.path.includes('persona'))).toBe(true);
        expect(result.errors.some(e => e.path.includes('role'))).toBe(true);
      }
    });
  });
});
