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
      apiVersion: 'spwnr/v1',
      kind: 'Subagent',
      metadata: {
        name: 'test-agent',
        version: '0.1.0',
        instruction: 'Review repository changes carefully.',
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
      ...overrides,
    };
  }

  it('returns no errors for a valid layout', () => {
    const pkgDir = join(tempDir, 'valid-layout');
    mkdirSync(join(pkgDir, 'schemas'), { recursive: true });

    writeFileSync(join(pkgDir, 'agent.md'), '# Agent\n');
    writeFileSync(join(pkgDir, 'schemas', 'input.schema.json'), '{}');
    writeFileSync(join(pkgDir, 'schemas', 'output.schema.json'), '{}');

    expect(validatePackageLayout(pkgDir, createManifest())).toEqual([]);
  });

  it('returns an error when the agent markdown file is missing', () => {
    const pkgDir = join(tempDir, 'missing-prompt');
    mkdirSync(join(pkgDir, 'schemas'), { recursive: true });

    writeFileSync(join(pkgDir, 'schemas', 'input.schema.json'), '{}');
    writeFileSync(join(pkgDir, 'schemas', 'output.schema.json'), '{}');

    const errors = validatePackageLayout(pkgDir, createManifest());
    expect(errors.some((error) => error.message.includes('spec.agent.path'))).toBe(true);
  });

  it('returns an error only when a declared schema file is missing', () => {
    const pkgDir = join(tempDir, 'missing-schema');
    mkdirSync(join(pkgDir, 'schemas'), { recursive: true });

    writeFileSync(join(pkgDir, 'agent.md'), '# Agent\n');
    writeFileSync(join(pkgDir, 'schemas', 'input.schema.json'), '{}');

    const errors = validatePackageLayout(pkgDir, createManifest());
    expect(errors.some((error) => error.message.includes('spec.schemas.output'))).toBe(true);
  });

  it('passes when schemas are omitted entirely', () => {
    const pkgDir = join(tempDir, 'no-schemas');
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(join(pkgDir, 'agent.md'), '# Agent\n');

    const manifest = createManifest({
      spec: {
        agent: { path: './agent.md' },
      },
    });

    expect(validatePackageLayout(pkgDir, manifest)).toEqual([]);
  });

  it('strict mode parses only declared schema files', () => {
    const pkgDir = join(tempDir, 'strict-schemas');
    mkdirSync(pkgDir, { recursive: true });
    mkdirSync(join(pkgDir, 'schemas'), { recursive: true });
    writeFileSync(join(pkgDir, 'agent.md'), '# Agent\n');
    writeFileSync(join(pkgDir, 'schemas', 'input.schema.json'), '{');

    const manifest = createManifest({
      spec: {
        agent: { path: './agent.md' },
        schemas: {
          input: './schemas/input.schema.json',
        },
      },
    });

    const errors = validatePackageLayout(pkgDir, manifest, { strict: true });
    expect(errors.some((error) => error.message.includes('invalid JSON'))).toBe(true);
  });

  it('validates layered skill paths across universal and host layers', () => {
    const pkgDir = join(tempDir, 'layered-skills');
    mkdirSync(join(pkgDir, 'schemas'), { recursive: true });
    mkdirSync(join(pkgDir, 'skills', 'universal', 'diff-reader'), { recursive: true });
    mkdirSync(join(pkgDir, 'skills', 'claude_code', 'diff-reader'), { recursive: true });
    writeFileSync(join(pkgDir, 'agent.md'), '# Agent\n');
    writeFileSync(join(pkgDir, 'schemas', 'input.schema.json'), '{}');
    writeFileSync(join(pkgDir, 'schemas', 'output.schema.json'), '{}');
    writeFileSync(join(pkgDir, 'skills', 'universal', 'diff-reader', 'SKILL.md'), '# universal\n');
    writeFileSync(join(pkgDir, 'skills', 'claude_code', 'diff-reader', 'SKILL.md'), '# claude\n');

    const manifest = createManifest({
      spec: {
        agent: { path: './agent.md' },
        schemas: {
          input: './schemas/input.schema.json',
          output: './schemas/output.schema.json',
        },
        skills: {
          universal: [
            { name: 'diff-reader', path: './skills/universal/diff-reader' },
          ],
          hosts: {
            claude_code: [
              { name: 'diff-reader', path: './skills/claude_code/diff-reader' },
            ],
          },
        },
        compatibility: {
          hosts: ['claude_code'],
        },
      },
    });

    expect(validatePackageLayout(pkgDir, manifest)).toEqual([]);
  });

  it('returns an error when a layered skill path is missing', () => {
    const pkgDir = join(tempDir, 'missing-layered-skill');
    mkdirSync(join(pkgDir, 'schemas'), { recursive: true });
    writeFileSync(join(pkgDir, 'agent.md'), '# Agent\n');
    writeFileSync(join(pkgDir, 'schemas', 'input.schema.json'), '{}');
    writeFileSync(join(pkgDir, 'schemas', 'output.schema.json'), '{}');

    const manifest = createManifest({
      spec: {
        agent: { path: './agent.md' },
        schemas: {
          input: './schemas/input.schema.json',
          output: './schemas/output.schema.json',
        },
        skills: {
          hosts: {
            codex: [
              { name: 'diff-reader', path: './skills/codex/diff-reader' },
            ],
          },
        },
        compatibility: {
          hosts: ['codex'],
        },
      },
    });

    const errors = validatePackageLayout(pkgDir, manifest);
    expect(errors.some((error) => error.message.includes('Skill path not found in codex layer'))).toBe(true);
  });

  it('returns an error when a skill host layer is outside compatibility.hosts', () => {
    const pkgDir = join(tempDir, 'mismatched-skill-host');
    mkdirSync(join(pkgDir, 'schemas'), { recursive: true });
    mkdirSync(join(pkgDir, 'skills', 'codex', 'diff-reader'), { recursive: true });
    writeFileSync(join(pkgDir, 'agent.md'), '# Agent\n');
    writeFileSync(join(pkgDir, 'schemas', 'input.schema.json'), '{}');
    writeFileSync(join(pkgDir, 'schemas', 'output.schema.json'), '{}');
    writeFileSync(join(pkgDir, 'skills', 'codex', 'diff-reader', 'SKILL.md'), '# codex\n');

    const manifest = createManifest({
      spec: {
        agent: { path: './agent.md' },
        schemas: {
          input: './schemas/input.schema.json',
          output: './schemas/output.schema.json',
        },
        skills: {
          hosts: {
            codex: [
              { name: 'diff-reader', path: './skills/codex/diff-reader' },
            ],
          },
        },
        compatibility: {
          hosts: ['claude_code'],
        },
      },
    });

    const errors = validatePackageLayout(pkgDir, manifest);
    expect(errors.some((error) => error.message.includes('Skill host layer not declared'))).toBe(true);
  });
});
