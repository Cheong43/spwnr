import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RegistryService } from '@spwnr/registry';
import { composeSession, injectStatic } from './service.js';

function createPackage(dir: string): void {
  mkdirSync(join(dir, 'schemas'), { recursive: true });
  mkdirSync(join(dir, 'skills', 'universal', 'repo-navigator'), { recursive: true });
  mkdirSync(join(dir, 'skills', 'universal', 'diff-reader'), { recursive: true });
  mkdirSync(join(dir, 'skills', 'claude_code', 'diff-reader'), { recursive: true });
  mkdirSync(join(dir, 'skills', 'codex', 'diff-reader'), { recursive: true });
  mkdirSync(join(dir, 'skills', 'copilot', 'diff-reader'), { recursive: true });
  mkdirSync(join(dir, 'skills', 'opencode', 'diff-reader'), { recursive: true });

  writeFileSync(join(dir, 'agent.md'), '# Review Agent\n\nReview carefully.');
  writeFileSync(join(dir, 'schemas', 'input.schema.json'), '{"type":"object"}');
  writeFileSync(join(dir, 'schemas', 'output.schema.json'), '{"type":"object"}');
  writeFileSync(join(dir, 'skills', 'universal', 'repo-navigator', 'SKILL.md'), '# repo-navigator\n\nInspect nearby files.');
  writeFileSync(join(dir, 'skills', 'universal', 'diff-reader', 'SKILL.md'), '# diff-reader\n\nUse the universal diff reader.');
  writeFileSync(join(dir, 'skills', 'claude_code', 'diff-reader', 'SKILL.md'), '# diff-reader\n\nUse Claude Code diff bindings.');
  writeFileSync(join(dir, 'skills', 'codex', 'diff-reader', 'SKILL.md'), '# diff-reader\n\nUse Codex diff bindings.');
  writeFileSync(join(dir, 'skills', 'copilot', 'diff-reader', 'SKILL.md'), '# diff-reader\n\nUse Copilot diff bindings.');
  writeFileSync(join(dir, 'skills', 'opencode', 'diff-reader', 'SKILL.md'), '# diff-reader\n\nUse OpenCode diff bindings.');
  writeFileSync(
    join(dir, 'subagent.yaml'),
    `apiVersion: spwnr/v1
kind: Subagent
metadata:
  name: review-agent
  version: 0.1.0
  instruction: Review code changes carefully.
  description: Review code changes
spec:
  agent:
    path: ./agent.md
  schemas:
    input: ./schemas/input.schema.json
    output: ./schemas/output.schema.json
  skills:
    universal:
      - name: diff-reader
        path: ./skills/universal/diff-reader
      - name: repo-navigator
        path: ./skills/universal/repo-navigator
    hosts:
      claude_code:
        - name: diff-reader
          path: ./skills/claude_code/diff-reader
      codex:
        - name: diff-reader
          path: ./skills/codex/diff-reader
      copilot:
        - name: diff-reader
          path: ./skills/copilot/diff-reader
      opencode:
        - name: diff-reader
          path: ./skills/opencode/diff-reader
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
    ['claude_code', 'review-agent.md', 'Use Claude Code diff bindings.'],
    ['copilot', 'review-agent.agent.md', 'Use Copilot diff bindings.'],
    ['opencode', 'review-agent.md', 'Use OpenCode diff bindings.'],
  ] as const)('writes static host files for %s', async (host, filename, expectedSkillText) => {
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

    expect(readFileSync(join(targetDir, filename), 'utf-8')).toContain('Review carefully.');
    expect(readFileSync(join(targetDir, filename), 'utf-8')).not.toContain('## System Prompt');
    if (host === 'claude_code') {
      expect(readFileSync(join(targetDir, filename), 'utf-8')).toContain('Claude Code should preload these skills');
      expect(result.files).toHaveLength(3);
      expect(readFileSync(join(baseDir, 'targets', 'skills', 'diff-reader', 'SKILL.md'), 'utf-8')).toContain('Use Claude Code diff bindings.');
      expect(readFileSync(join(baseDir, 'targets', 'skills', 'repo-navigator', 'SKILL.md'), 'utf-8')).toContain('Inspect nearby files.');
    } else {
      expect(readFileSync(join(targetDir, filename), 'utf-8')).toContain(expectedSkillText);
      expect(readFileSync(join(targetDir, filename), 'utf-8')).toContain('Inspect nearby files.');
    }
  });

  it('writes codex static files as a custom agent TOML file', async () => {
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

    expect(result.files).toHaveLength(1);
    const content = readFileSync(join(targetDir, 'review-agent.toml'), 'utf-8');
    expect(content).toContain('name = "review-agent"');
    expect(content).toContain('description = "Review code changes carefully."');
    expect(content).toContain('developer_instructions = """');
    expect(content).toContain('Review carefully.');
    expect(content).toContain('Use Codex diff bindings.');
    expect(content).toContain('Inspect nearby files.');
    expect(content).not.toContain('Use the universal diff reader.');
  });

  it.each([
    ['claude_code', 'json', 'Use Claude Code diff bindings.'],
    ['copilot', 'shell', 'Use Copilot diff bindings.'],
    ['opencode', 'json', 'Use OpenCode diff bindings.'],
    ['codex', 'shell', 'Use Codex diff bindings.'],
  ] as const)('composes %s session output in %s format', async (host, format, expectedSkillText) => {
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
    if (host === 'claude_code') {
      expect(JSON.stringify(result.descriptor)).toContain('"skills":["diff-reader","repo-navigator"]');
    } else {
      expect(JSON.stringify(result.descriptor)).toContain(expectedSkillText);
      expect(JSON.stringify(result.descriptor)).toContain('Inspect nearby files.');
      if (host === 'codex') {
        expect(JSON.stringify(result.descriptor)).toContain('.codex/agents/review-agent.toml');
      }
    }
    if (format === 'json') {
      expect(() => JSON.parse(result.content)).not.toThrow();
    } else {
      expect(result.content).toContain(host === 'codex' ? 'preview-only' : host.split('_')[0]);
    }
  });
});
