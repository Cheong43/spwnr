import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { SubagentManifest } from '@spwnr/core-types';
import { validatePackageLayout } from './package-validator.js';

describe('PackageValidator', () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'spwnr-validator-test-'));
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  function createManifest(overrides: Partial<SubagentManifest> = {}): SubagentManifest {
    return {
      apiVersion: 'subagent.io/v0.1',
      kind: 'Subagent',
      metadata: {
        name: 'test-agent',
        version: '0.1.0',
      },
      spec: {
        instructions: {
          system: './prompts/system.md',
        },
        input: {
          schema: './schemas/input.schema.json',
        },
        output: {
          schema: './schemas/output.schema.json',
        },
        workflow: {
          entry: 'main',
        },
      },
      ...overrides,
    };
  }

  it('returns no errors for a valid layout', () => {
    const pkgDir = join(tempDir, 'valid-layout');
    mkdirSync(join(pkgDir, 'prompts'), { recursive: true });
    mkdirSync(join(pkgDir, 'schemas'), { recursive: true });
    mkdirSync(join(pkgDir, 'workflow'), { recursive: true });

    writeFileSync(join(pkgDir, 'prompts', 'system.md'), 'Be helpful.');
    writeFileSync(join(pkgDir, 'schemas', 'input.schema.json'), '{}');
    writeFileSync(join(pkgDir, 'schemas', 'output.schema.json'), '{}');
    writeFileSync(join(pkgDir, 'workflow', 'main.yaml'), 'steps: []');

    expect(validatePackageLayout(pkgDir, createManifest())).toEqual([]);
  });

  it('returns an error when the system prompt is missing', () => {
    const pkgDir = join(tempDir, 'missing-prompt');
    mkdirSync(join(pkgDir, 'schemas'), { recursive: true });
    mkdirSync(join(pkgDir, 'workflow'), { recursive: true });

    writeFileSync(join(pkgDir, 'schemas', 'input.schema.json'), '{}');
    writeFileSync(join(pkgDir, 'schemas', 'output.schema.json'), '{}');
    writeFileSync(join(pkgDir, 'workflow', 'main.yaml'), 'steps: []');

    const errors = validatePackageLayout(pkgDir, createManifest());
    expect(errors.some((error) => error.message.includes('spec.instructions.system'))).toBe(true);
  });

  it('returns an error when legacy workflow metadata points to a missing file', () => {
    const pkgDir = join(tempDir, 'missing-workflow');
    mkdirSync(join(pkgDir, 'prompts'), { recursive: true });
    mkdirSync(join(pkgDir, 'schemas'), { recursive: true });

    writeFileSync(join(pkgDir, 'prompts', 'system.md'), 'Be helpful.');
    writeFileSync(join(pkgDir, 'schemas', 'input.schema.json'), '{}');
    writeFileSync(join(pkgDir, 'schemas', 'output.schema.json'), '{}');

    const errors = validatePackageLayout(pkgDir, createManifest());
    expect(errors.some((error) => error.code === 'WORKFLOW_INVALID')).toBe(true);
  });

  it('skips workflow validation when workflow metadata is absent', () => {
    const pkgDir = join(tempDir, 'no-workflow');
    mkdirSync(join(pkgDir, 'prompts'), { recursive: true });
    mkdirSync(join(pkgDir, 'schemas'), { recursive: true });

    writeFileSync(join(pkgDir, 'prompts', 'system.md'), 'Be helpful.');
    writeFileSync(join(pkgDir, 'schemas', 'input.schema.json'), '{}');
    writeFileSync(join(pkgDir, 'schemas', 'output.schema.json'), '{}');

    const manifest = createManifest({
      spec: {
        instructions: { system: './prompts/system.md' },
        input: { schema: './schemas/input.schema.json' },
        output: { schema: './schemas/output.schema.json' },
      },
    });

    expect(validatePackageLayout(pkgDir, manifest)).toEqual([]);
  });
});
