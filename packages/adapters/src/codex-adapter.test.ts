import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { CodexAdapter } from './codex-adapter.js';

function createPackageDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'spwnr-codex-adapter-'));
  writeFileSync(join(dir, 'agent.md'), '# Skill Builder\n\nUse local skills.');
  writeFileSync(join(dir, 'diff-reader-universal.md'), '# diff-reader\n\nUniversal diff parsing.');
  writeFileSync(join(dir, 'diff-reader-codex.md'), '# diff-reader\n\nUse Codex diff bindings.');
  writeFileSync(join(dir, 'repo-navigator.md'), '# repo-navigator\n\nRead nearby files.');
  return dir;
}

const manifest = {
  apiVersion: 'subagent.io/v0.3',
  kind: 'Subagent' as const,
  metadata: {
    name: 'Skill Builder',
    version: '0.1.0',
    instruction: 'Build local skills for Codex.',
  },
  spec: {
    agent: { path: './agent.md' },
    skills: {
      universal: [
        { name: 'diff-reader', path: './diff-reader-universal.md' },
        { name: 'repo-navigator', path: './repo-navigator.md' },
      ],
      hosts: {
        codex: [
          { name: 'diff-reader', path: './diff-reader-codex.md' },
        ],
      },
    },
    compatibility: {
      hosts: ['codex'],
    },
  },
};

describe('CodexAdapter', () => {
  const createdDirs: string[] = [];

  afterEach(() => {
    for (const dir of createdDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('writes SKILL.md and metadata for static injection', () => {
    const packageDir = createPackageDir();
    createdDirs.push(packageDir);
    const targetDir = join(packageDir, 'out');
    const adapter = new CodexAdapter();
    const compiled = adapter.compile({ manifest, packageDir });

    const result = adapter.materializeStatic(compiled, { directory: targetDir, scope: 'project' });

    expect(result.files).toHaveLength(2);
    expect(readFileSync(join(targetDir, 'skill-builder', 'SKILL.md'), 'utf-8')).toContain('Use local skills.');
    expect(readFileSync(join(targetDir, 'skill-builder', 'SKILL.md'), 'utf-8')).toContain('Use Codex diff bindings.');
    expect(readFileSync(join(targetDir, 'skill-builder', 'SKILL.md'), 'utf-8')).toContain('Read nearby files.');
    expect(readFileSync(join(targetDir, 'skill-builder', 'SKILL.md'), 'utf-8')).not.toContain('Universal diff parsing.');
    expect(readFileSync(join(targetDir, 'skill-builder', 'SKILL.md'), 'utf-8')).not.toContain('## System Prompt');
    expect(readFileSync(join(targetDir, 'skill-builder', 'agent.json'), 'utf-8')).toContain('"name": "skill-builder"');
    expect(readFileSync(join(targetDir, 'skill-builder', 'agent.json'), 'utf-8')).toContain('"description": "Build local skills for Codex."');
    expect(readFileSync(join(targetDir, 'skill-builder', 'agent.json'), 'utf-8')).toContain('"skills": [');
  });

  it('marks session descriptors as preview only', () => {
    const packageDir = createPackageDir();
    createdDirs.push(packageDir);
    const adapter = new CodexAdapter();
    const compiled = adapter.compile({ manifest, packageDir });

    const result = adapter.composeSession(compiled, { scope: 'project' });

    expect(result.previewOnly).toBe(true);
    expect(result.warnings).toContain('Codex session injection is preview-only in this release.');
    expect(JSON.stringify(result.descriptor)).toContain('Use Codex diff bindings.');
  });
});
