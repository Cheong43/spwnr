import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { validatePackageLayout } from './package-validator.js';
import type { SubagentManifest } from '@orchex/core-types';

describe('PackageValidator', () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'orchex-validator-test-'));
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  const createMinimalManifest = (overrides?: Partial<SubagentManifest>): SubagentManifest => ({
    apiVersion: 'subagent.io/v0.1',
    kind: 'Subagent',
    metadata: {
      name: 'test-agent',
      version: '0.1.0',
    },
    spec: {
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
  });

  it('returns no errors for valid layout', () => {
    const pkgDir = join(tempDir, 'valid-layout');
    mkdirSync(join(pkgDir, 'schemas'), { recursive: true });
    mkdirSync(join(pkgDir, 'workflow'), { recursive: true });

    writeFileSync(join(pkgDir, 'schemas', 'input.schema.json'), '{}');
    writeFileSync(join(pkgDir, 'schemas', 'output.schema.json'), '{}');
    writeFileSync(join(pkgDir, 'workflow', 'main.yaml'), 'steps: []');

    const manifest = createMinimalManifest();
    const errors = validatePackageLayout(pkgDir, manifest);

    expect(errors).toEqual([]);
  });

  it('returns error when input schema missing', () => {
    const pkgDir = join(tempDir, 'missing-input');
    mkdirSync(join(pkgDir, 'schemas'), { recursive: true });
    mkdirSync(join(pkgDir, 'workflow'), { recursive: true });

    writeFileSync(join(pkgDir, 'schemas', 'output.schema.json'), '{}');
    writeFileSync(join(pkgDir, 'workflow', 'main.yaml'), 'steps: []');

    const manifest = createMinimalManifest();
    const errors = validatePackageLayout(pkgDir, manifest);

    expect(errors.length).toBeGreaterThan(0);
    const inputError = errors.find((e) => e.message.includes('spec.input.schema'));
    expect(inputError).toBeDefined();
    expect(inputError?.code).toBe('MANIFEST_INVALID');
  });

  it('returns error when output schema missing', () => {
    const pkgDir = join(tempDir, 'missing-output');
    mkdirSync(join(pkgDir, 'schemas'), { recursive: true });
    mkdirSync(join(pkgDir, 'workflow'), { recursive: true });

    writeFileSync(join(pkgDir, 'schemas', 'input.schema.json'), '{}');
    writeFileSync(join(pkgDir, 'workflow', 'main.yaml'), 'steps: []');

    const manifest = createMinimalManifest();
    const errors = validatePackageLayout(pkgDir, manifest);

    expect(errors.length).toBeGreaterThan(0);
    const outputError = errors.find((e) => e.message.includes('spec.output.schema'));
    expect(outputError).toBeDefined();
    expect(outputError?.code).toBe('MANIFEST_INVALID');
  });

  it('returns error when workflow entry missing', () => {
    const pkgDir = join(tempDir, 'missing-workflow');
    mkdirSync(join(pkgDir, 'schemas'), { recursive: true });
    mkdirSync(join(pkgDir, 'workflow'), { recursive: true });

    writeFileSync(join(pkgDir, 'schemas', 'input.schema.json'), '{}');
    writeFileSync(join(pkgDir, 'schemas', 'output.schema.json'), '{}');

    const manifest = createMinimalManifest();
    const errors = validatePackageLayout(pkgDir, manifest);

    expect(errors.length).toBeGreaterThan(0);
    const workflowError = errors.find((e) => e.code === 'WORKFLOW_INVALID');
    expect(workflowError).toBeDefined();
    expect(workflowError?.message).toContain('workflow/main.yaml');
  });

  it('accepts .yml extension for workflow', () => {
    const pkgDir = join(tempDir, 'yml-workflow');
    mkdirSync(join(pkgDir, 'schemas'), { recursive: true });
    mkdirSync(join(pkgDir, 'workflow'), { recursive: true });

    writeFileSync(join(pkgDir, 'schemas', 'input.schema.json'), '{}');
    writeFileSync(join(pkgDir, 'schemas', 'output.schema.json'), '{}');
    writeFileSync(join(pkgDir, 'workflow', 'main.yml'), 'steps: []');

    const manifest = createMinimalManifest();
    const errors = validatePackageLayout(pkgDir, manifest);

    const workflowError = errors.find((e) => e.code === 'WORKFLOW_INVALID');
    expect(workflowError).toBeUndefined();
  });

  it('returns error when skill path missing', () => {
    const pkgDir = join(tempDir, 'missing-skill');
    mkdirSync(join(pkgDir, 'schemas'), { recursive: true });
    mkdirSync(join(pkgDir, 'workflow'), { recursive: true });

    writeFileSync(join(pkgDir, 'schemas', 'input.schema.json'), '{}');
    writeFileSync(join(pkgDir, 'schemas', 'output.schema.json'), '{}');
    writeFileSync(join(pkgDir, 'workflow', 'main.yaml'), 'steps: []');

    const manifest = createMinimalManifest({
      spec: {
        input: { schema: './schemas/input.schema.json' },
        output: { schema: './schemas/output.schema.json' },
        workflow: { entry: 'main' },
        skills: {
          refs: [
            {
              name: 'my-skill',
              path: './skills/my-skill',
            },
          ],
        },
      },
    });

    const errors = validatePackageLayout(pkgDir, manifest);

    expect(errors.length).toBeGreaterThan(0);
    const skillError = errors.find((e) => e.message.includes('my-skill'));
    expect(skillError).toBeDefined();
    expect(skillError?.code).toBe('MANIFEST_INVALID');
    expect(skillError?.message).toContain('Skill path not found');
  });

  it('does not error for skill without path', () => {
    const pkgDir = join(tempDir, 'skill-no-path');
    mkdirSync(join(pkgDir, 'schemas'), { recursive: true });
    mkdirSync(join(pkgDir, 'workflow'), { recursive: true });

    writeFileSync(join(pkgDir, 'schemas', 'input.schema.json'), '{}');
    writeFileSync(join(pkgDir, 'schemas', 'output.schema.json'), '{}');
    writeFileSync(join(pkgDir, 'workflow', 'main.yaml'), 'steps: []');

    const manifest = createMinimalManifest({
      spec: {
        input: { schema: './schemas/input.schema.json' },
        output: { schema: './schemas/output.schema.json' },
        workflow: { entry: 'main' },
        skills: {
          refs: [
            {
              name: 'external-skill',
            },
          ],
        },
      },
    });

    const errors = validatePackageLayout(pkgDir, manifest);

    const skillError = errors.find((e) => e.message.includes('external-skill'));
    expect(skillError).toBeUndefined();
  });

  it('in strict mode validates JSON schemas are valid', () => {
    const pkgDir = join(tempDir, 'strict-valid');
    mkdirSync(join(pkgDir, 'schemas'), { recursive: true });
    mkdirSync(join(pkgDir, 'workflow'), { recursive: true });

    writeFileSync(join(pkgDir, 'schemas', 'input.schema.json'), '{"type": "object"}');
    writeFileSync(join(pkgDir, 'schemas', 'output.schema.json'), '{"type": "string"}');
    writeFileSync(join(pkgDir, 'workflow', 'main.yaml'), 'steps: []');

    const manifest = createMinimalManifest();
    const errors = validatePackageLayout(pkgDir, manifest, { strict: true });

    const jsonError = errors.find((e) => e.message.includes('invalid JSON'));
    expect(jsonError).toBeUndefined();
  });

  it('in strict mode returns error for invalid JSON in schema', () => {
    const pkgDir = join(tempDir, 'strict-invalid');
    mkdirSync(join(pkgDir, 'schemas'), { recursive: true });
    mkdirSync(join(pkgDir, 'workflow'), { recursive: true });

    writeFileSync(join(pkgDir, 'schemas', 'input.schema.json'), '{ invalid json }');
    writeFileSync(join(pkgDir, 'schemas', 'output.schema.json'), '{}');
    writeFileSync(join(pkgDir, 'workflow', 'main.yaml'), 'steps: []');

    const manifest = createMinimalManifest();
    const errors = validatePackageLayout(pkgDir, manifest, { strict: true });

    expect(errors.length).toBeGreaterThan(0);
    const jsonError = errors.find((e) => e.message.includes('invalid JSON'));
    expect(jsonError).toBeDefined();
    expect(jsonError?.code).toBe('MANIFEST_INVALID');
  });

  it('returns multiple errors when multiple files missing', () => {
    const pkgDir = join(tempDir, 'multiple-errors');
    mkdirSync(pkgDir, { recursive: true });

    const manifest = createMinimalManifest();
    const errors = validatePackageLayout(pkgDir, manifest);

    expect(errors.length).toBeGreaterThanOrEqual(2);
    const inputError = errors.find((e) => e.message.includes('input.schema'));
    const outputError = errors.find((e) => e.message.includes('output.schema'));
    expect(inputError).toBeDefined();
    expect(outputError).toBeDefined();
  });
});
