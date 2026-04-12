import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { CopilotAdapter } from './copilot-adapter.js';

function createPackageDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'spwnr-copilot-adapter-'));
  writeFileSync(join(dir, 'agent.md'), '# Planner\n\nDraft a clear plan.');
  writeFileSync(join(dir, 'repo-navigator.md'), '# repo-navigator\n\nInspect workspace files.');
  writeFileSync(join(dir, 'diff-reader-copilot.md'), '# diff-reader\n\nUse Copilot agent file tools.');
  return dir;
}

const manifest = {
  apiVersion: 'spwnr/v1',
  kind: 'Subagent' as const,
  metadata: {
    name: 'Planner',
    version: '0.1.0',
    instruction: 'Draft implementation plans directly.',
    description: 'Draft implementation plans.',
  },
  spec: {
    agent: { path: './agent.md' },
    skills: {
      universal: [
        { name: 'repo-navigator', path: './repo-navigator.md' },
      ],
      hosts: {
        copilot: [
          { name: 'diff-reader', path: './diff-reader-copilot.md' },
        ],
      },
    },
    compatibility: {
      hosts: ['copilot'],
    },
  },
};

describe('CopilotAdapter', () => {
  const createdDirs: string[] = [];

  afterEach(() => {
    for (const dir of createdDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('writes a .agent.md file for static injection', () => {
    const packageDir = createPackageDir();
    createdDirs.push(packageDir);
    const targetDir = join(packageDir, 'out');
    const adapter = new CopilotAdapter();
    const compiled = adapter.compile({ manifest, packageDir });

    adapter.materializeStatic(compiled, { directory: targetDir, scope: 'project' });

    expect(readFileSync(join(targetDir, 'planner.agent.md'), 'utf-8')).toContain('name: planner');
    expect(readFileSync(join(targetDir, 'planner.agent.md'), 'utf-8')).toContain('description: "Draft implementation plans directly."');
    expect(readFileSync(join(targetDir, 'planner.agent.md'), 'utf-8')).toContain('Use Copilot agent file tools.');
    expect(readFileSync(join(targetDir, 'planner.agent.md'), 'utf-8')).toContain('Inspect workspace files.');
    expect(readFileSync(join(targetDir, 'planner.agent.md'), 'utf-8')).not.toContain('## Model Binding');
  });

  it('returns a lightweight profile descriptor for sessions', () => {
    const packageDir = createPackageDir();
    createdDirs.push(packageDir);
    const adapter = new CopilotAdapter();
    const compiled = adapter.compile({ manifest, packageDir });

    const result = adapter.composeSession(compiled, { scope: 'user' });

    expect(result.descriptor).toEqual(
      expect.objectContaining({
        profile: expect.objectContaining({
          name: 'planner',
          description: 'Draft implementation plans directly.',
          instructions: expect.stringContaining('Use Copilot agent file tools.'),
        }),
      }),
    );
    expect(result.shellCommand).toContain('copilot --agent=planner');
  });
});
