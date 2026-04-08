import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { ClaudeAdapter } from './claude-adapter.js';

function createPackageDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'spwnr-claude-adapter-'));
  writeFileSync(join(dir, 'agent.md'), '# Code Reviewer\n\nReview with care.');
  return dir;
}

function createManifest() {
  return {
    apiVersion: 'subagent.io/v0.2',
    kind: 'Subagent' as const,
    metadata: {
      name: 'Code Reviewer',
      version: '0.1.0',
      instruction: 'Review pull requests carefully.',
      description: 'Review pull requests.',
    },
    spec: {
      agent: {
        path: './agent.md',
      },
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
    expect(readFileSync(join(targetDir, 'code-reviewer.md'), 'utf-8')).not.toContain('## System Prompt');
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
            description: 'Review pull requests carefully.',
          }),
        ],
      }),
    );
    expect(result.shellCommand).toContain('claude --agents');
  });
});
