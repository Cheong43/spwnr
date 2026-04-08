import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { OpenCodeAdapter } from './opencode-adapter.js';

function createPackageDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'spwnr-opencode-adapter-'));
  writeFileSync(join(dir, 'agent.md'), '# Repo Navigator\n\nNavigate repos quickly.');
  writeFileSync(join(dir, 'repo-navigator.md'), '# repo-navigator\n\nRead repository files.');
  writeFileSync(join(dir, 'diff-reader-opencode.md'), '# diff-reader\n\nUse OpenCode diff tooling.');
  return dir;
}

const manifest = {
  apiVersion: 'subagent.io/v0.3',
  kind: 'Subagent' as const,
  metadata: {
    name: 'Repo Navigator',
    version: '0.1.0',
    instruction: 'Navigate repositories quickly.',
  },
  spec: {
    agent: { path: './agent.md' },
    skills: {
      universal: [
        { name: 'repo-navigator', path: './repo-navigator.md' },
      ],
      hosts: {
        opencode: [
          { name: 'diff-reader', path: './diff-reader-opencode.md' },
        ],
      },
    },
    compatibility: {
      hosts: ['opencode'],
    },
  },
};

describe('OpenCodeAdapter', () => {
  const createdDirs: string[] = [];

  afterEach(() => {
    for (const dir of createdDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('writes an opencode markdown file', () => {
    const packageDir = createPackageDir();
    createdDirs.push(packageDir);
    const targetDir = join(packageDir, 'out');
    const adapter = new OpenCodeAdapter();
    const compiled = adapter.compile({ manifest, packageDir });

    adapter.materializeStatic(compiled, { directory: targetDir, scope: 'project' });

    expect(readFileSync(join(targetDir, 'repo-navigator.md'), 'utf-8')).toContain('Navigate repos quickly.');
    expect(readFileSync(join(targetDir, 'repo-navigator.md'), 'utf-8')).toContain('Use OpenCode diff tooling.');
    expect(readFileSync(join(targetDir, 'repo-navigator.md'), 'utf-8')).toContain('Read repository files.');
  });

  it('produces an overlay descriptor', () => {
    const packageDir = createPackageDir();
    createdDirs.push(packageDir);
    const adapter = new OpenCodeAdapter();
    const compiled = adapter.compile({ manifest, packageDir });

    const result = adapter.composeSession(compiled, { scope: 'user' });

    expect(result.descriptor).toEqual(
      expect.objectContaining({
        overlay: expect.any(Object),
      }),
    );
    expect(JSON.stringify(result.descriptor)).toContain('Use OpenCode diff tooling.');
    expect(result.shellCommand).toContain('opencode --descriptor');
  });
});
