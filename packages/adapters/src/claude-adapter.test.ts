import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { ClaudeAdapter } from './claude-adapter.js';

function createPackageDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'spwnr-claude-adapter-'));
  writeFileSync(join(dir, 'agent.md'), '# Code Reviewer\n\nReview with care.');
  writeFileSync(join(dir, 'diff-reader-universal.md'), '# diff-reader\n\nParse diffs universally.');
  writeFileSync(join(dir, 'diff-reader-claude.md'), '# diff-reader\n\nUse Claude-specific diff tools.');
  writeFileSync(join(dir, 'repo-navigator.md'), '# repo-navigator\n\nInspect repository files.');
  return dir;
}

function createManifest() {
  return {
    apiVersion: 'spwnr/v1',
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
        universal: [
          { name: 'diff-reader', path: './diff-reader-universal.md' },
          { name: 'repo-navigator', path: './repo-navigator.md' },
        ],
        hosts: {
          claude_code: [
            { name: 'diff-reader', path: './diff-reader-claude.md' },
          ],
        },
      },
      compatibility: {
        hosts: ['claude_code'],
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

    expect(result.files).toHaveLength(3);
    expect(readFileSync(join(targetDir, 'code-reviewer.md'), 'utf-8')).toContain('---');
    expect(readFileSync(join(targetDir, 'code-reviewer.md'), 'utf-8')).toContain('name: code-reviewer');
    expect(readFileSync(join(targetDir, 'code-reviewer.md'), 'utf-8')).toContain('description: "Review pull requests carefully."');
    expect(readFileSync(join(targetDir, 'code-reviewer.md'), 'utf-8')).toContain('skills:');
    expect(readFileSync(join(targetDir, 'code-reviewer.md'), 'utf-8')).toContain('  - diff-reader');
    expect(readFileSync(join(targetDir, 'code-reviewer.md'), 'utf-8')).toContain('Review with care.');
    expect(readFileSync(join(targetDir, 'code-reviewer.md'), 'utf-8')).toContain('spwnr inject "Code Reviewer" --host claude_code --scope project');
    expect(readFileSync(join(targetDir, 'code-reviewer.md'), 'utf-8')).not.toContain('## System Prompt');
    expect(readFileSync(join(packageDir, 'skills', 'diff-reader', 'SKILL.md'), 'utf-8')).toContain('Use Claude-specific diff tools.');
    expect(readFileSync(join(packageDir, 'skills', 'diff-reader', 'SKILL.md'), 'utf-8')).not.toContain('Parse diffs universally.');
    expect(readFileSync(join(packageDir, 'skills', 'repo-navigator', 'SKILL.md'), 'utf-8')).toContain('Inspect repository files.');
  });

  it('composes a claude session bundle', () => {
    const packageDir = createPackageDir();
    createdDirs.push(packageDir);
    const adapter = new ClaudeAdapter();
    const compiled = adapter.compile({ manifest: createManifest(), packageDir });

    const result = adapter.composeSession(compiled, { scope: 'project' });

    expect(result.descriptor).toEqual(
      expect.objectContaining({
        'code-reviewer': expect.objectContaining({
            description: 'Review pull requests carefully.',
            skills: ['diff-reader', 'repo-navigator'],
            prompt: expect.stringContaining('## Preloaded Skills'),
          }),
      }),
    );
    expect(result.shellCommand).toContain('claude --agents');
  });
});
