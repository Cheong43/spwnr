import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RegistryService } from '@spwnr/registry';
import { composeSession, injectStatic } from './service.js';

function createPackage(dir: string): void {
  mkdirSync(join(dir, 'prompts'), { recursive: true });
  mkdirSync(join(dir, 'schemas'), { recursive: true });
  mkdirSync(join(dir, 'workflow'), { recursive: true });

  writeFileSync(join(dir, 'prompts', 'system.md'), 'Review carefully.');
  writeFileSync(join(dir, 'schemas', 'input.schema.json'), '{"type":"object"}');
  writeFileSync(join(dir, 'schemas', 'output.schema.json'), '{"type":"object"}');
  writeFileSync(join(dir, 'workflow', 'main.yaml'), 'steps: []');
  writeFileSync(
    join(dir, 'subagent.yaml'),
    `apiVersion: subagent.io/v0.1
kind: Subagent
metadata:
  name: review-agent
  version: 0.1.0
  description: Review code changes
spec:
  instructions:
    system: ./prompts/system.md
  input:
    schema: ./schemas/input.schema.json
  output:
    schema: ./schemas/output.schema.json
  workflow:
    entry: main
  compatibility:
    hosts:
      - claude_code
      - codex
      - copilot
      - opencode
`,
  );
}

describe('injector service', () => {
  let baseDir: string;
  let registry: RegistryService;

  beforeEach(() => {
    baseDir = join(tmpdir(), `spwnr-injector-${randomUUID()}`);
    mkdirSync(baseDir, { recursive: true });
    process.env.SPWNR_HOME = baseDir;
    registry = new RegistryService(join(baseDir, 'registry.db'));
  });

  afterEach(() => {
    registry?.close();
    rmSync(baseDir, { recursive: true, force: true });
    delete process.env.SPWNR_HOME;
  });

  it.each([
    ['claude_code', 'review-agent.md'],
    ['copilot', 'review-agent.agent.md'],
    ['opencode', 'review-agent.md'],
  ] as const)('writes static host files for %s', async (host, filename) => {
    const pkgDir = join(baseDir, `${host}-pkg`);
    mkdirSync(pkgDir, { recursive: true });
    createPackage(pkgDir);
    await registry.publish(pkgDir);

    const targetDir = join(baseDir, 'targets', host);
    const result = await injectStatic({
      registry,
      packageName: 'review-agent',
      host,
      targetDir,
    });

    expect(result.files).toHaveLength(1);
    expect(readFileSync(join(targetDir, filename), 'utf-8')).toContain('Review carefully.');
  });

  it('writes codex static files into a skill directory', async () => {
    const pkgDir = join(baseDir, 'codex-pkg');
    mkdirSync(pkgDir, { recursive: true });
    createPackage(pkgDir);
    await registry.publish(pkgDir);

    const targetDir = join(baseDir, 'targets', 'codex');
    const result = await injectStatic({
      registry,
      packageName: 'review-agent',
      host: 'codex',
      targetDir,
    });

    expect(result.files).toHaveLength(2);
    expect(readFileSync(join(targetDir, 'review-agent', 'SKILL.md'), 'utf-8')).toContain('Review carefully.');
    expect(readFileSync(join(targetDir, 'review-agent', 'agent.json'), 'utf-8')).toContain('"name": "review-agent"');
  });

  it.each([
    ['claude_code', 'json'],
    ['copilot', 'shell'],
    ['opencode', 'json'],
    ['codex', 'shell'],
  ] as const)('composes %s session output in %s format', async (host, format) => {
    const pkgDir = join(baseDir, `${host}-session-pkg`);
    mkdirSync(pkgDir, { recursive: true });
    createPackage(pkgDir);
    await registry.publish(pkgDir);

    const result = await composeSession({
      registry,
      packageName: 'review-agent',
      host,
      format,
    });

    expect(result.content.length).toBeGreaterThan(0);
    if (format === 'json') {
      expect(() => JSON.parse(result.content)).not.toThrow();
    } else {
      expect(result.content).toContain(host === 'codex' ? 'preview-only' : host.split('_')[0]);
    }
  });
});
