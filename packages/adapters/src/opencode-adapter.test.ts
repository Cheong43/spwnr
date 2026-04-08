import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { OpenCodeAdapter } from './opencode-adapter.js';

function createPackageDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'spwnr-opencode-adapter-'));
  writeFileSync(join(dir, 'agent.md'), '# Repo Navigator\n\nNavigate repos quickly.');
  return dir;
}

const manifest = {
  apiVersion: 'subagent.io/v0.2',
  kind: 'Subagent' as const,
  metadata: {
    name: 'Repo Navigator',
    version: '0.1.0',
    instruction: 'Navigate repositories quickly.',
  },
  spec: {
    agent: { path: './agent.md' },
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
    expect(readFileSync(join(targetDir, 'repo-navigator.md'), 'utf-8')).not.toContain('## Skills');
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
    expect(result.shellCommand).toContain('opencode --descriptor');
  });
});
