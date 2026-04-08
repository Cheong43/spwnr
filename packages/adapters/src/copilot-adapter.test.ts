import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { CopilotAdapter } from './copilot-adapter.js';

function createPackageDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'spwnr-copilot-adapter-'));
  mkdirSync(join(dir, 'prompts'), { recursive: true });
  writeFileSync(join(dir, 'prompts', 'system.md'), 'Draft a clear plan.');
  return dir;
}

const manifest = {
  apiVersion: 'subagent.io/v0.1',
  kind: 'Subagent' as const,
  metadata: {
    name: 'Planner',
    version: '0.1.0',
    description: 'Draft implementation plans.',
  },
  spec: {
    instructions: { system: './prompts/system.md' },
    input: { schema: './schemas/input.schema.json' },
    output: { schema: './schemas/output.schema.json' },
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
  });

  it('returns a lightweight profile descriptor for sessions', () => {
    const packageDir = createPackageDir();
    createdDirs.push(packageDir);
    const adapter = new CopilotAdapter();
    const compiled = adapter.compile({ manifest, packageDir });

    const result = adapter.composeSession(compiled, { scope: 'user' });

    expect(result.descriptor).toEqual(
      expect.objectContaining({
        profile: expect.objectContaining({ name: 'planner' }),
      }),
    );
    expect(result.shellCommand).toContain('copilot --agent=planner');
  });
});
