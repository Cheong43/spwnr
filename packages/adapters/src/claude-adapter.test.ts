import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { ClaudeAdapter } from './claude-adapter.js';

function createPackageDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'spwnr-claude-adapter-'));
  mkdirSync(join(dir, 'prompts'), { recursive: true });
  writeFileSync(join(dir, 'prompts', 'system.md'), 'Review with care.');
  return dir;
}

function createManifest() {
  return {
    apiVersion: 'subagent.io/v0.1',
    kind: 'Subagent' as const,
    metadata: {
      name: 'Code Reviewer',
      version: '0.1.0',
      description: 'Review pull requests.',
    },
    spec: {
      instructions: {
        system: './prompts/system.md',
      },
      input: { schema: './schemas/input.schema.json' },
      output: { schema: './schemas/output.schema.json' },
      skills: {
        refs: [{ name: 'diff-reader', path: './skills/diff-reader' }],
      },
    },
  };
}

describe('ClaudeAdapter', () => {
  const createdDirs: string[] = [];

  afterEach(() => {
    for (const dir of createdDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('materializes a markdown agent file', () => {
    const packageDir = createPackageDir();
    createdDirs.push(packageDir);
    const targetDir = join(packageDir, 'out');
    const adapter = new ClaudeAdapter();
    const compiled = adapter.compile({ manifest: createManifest(), packageDir });

    const result = adapter.materializeStatic(compiled, { directory: targetDir, scope: 'project' });

    expect(result.files).toHaveLength(1);
    expect(readFileSync(join(targetDir, 'code-reviewer.md'), 'utf-8')).toContain('Review with care.');
  });

  it('composes a claude session bundle', () => {
    const packageDir = createPackageDir();
    createdDirs.push(packageDir);
    const adapter = new ClaudeAdapter();
    const compiled = adapter.compile({ manifest: createManifest(), packageDir });

    const result = adapter.composeSession(compiled, { scope: 'project' });

    expect(result.descriptor).toEqual(
      expect.objectContaining({
        agents: [
          expect.objectContaining({
            name: 'code-reviewer',
          }),
        ],
      }),
    );
    expect(result.shellCommand).toContain('claude --agents');
  });
});
