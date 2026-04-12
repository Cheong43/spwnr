import { describe, expect, it } from 'vitest';
import { resolveSkillsForHost, type SubagentManifest } from './manifest.js';

function createManifest(skills: NonNullable<SubagentManifest['spec']['skills']>): SubagentManifest {
  return {
    apiVersion: 'spwnr/v1',
    kind: 'Subagent',
    metadata: {
      name: 'skill-test-agent',
      version: '0.1.0',
      instruction: 'Resolve host-specific skills.',
    },
    spec: {
      agent: { path: './agent.md' },
      skills,
    },
  };
}

describe('resolveSkillsForHost', () => {
  it('returns universal skills when no host override exists', () => {
    const manifest = createManifest({
      universal: [
        { name: 'diff-reader', path: './skills/universal/diff-reader' },
        { name: 'repo-navigator', path: './skills/universal/repo-navigator' },
      ],
    });

    expect(resolveSkillsForHost(manifest, 'codex')).toEqual([
      { name: 'diff-reader', path: './skills/universal/diff-reader' },
      { name: 'repo-navigator', path: './skills/universal/repo-navigator' },
    ]);
  });

  it('prefers host skills over same-named universal skills', () => {
    const manifest = createManifest({
      universal: [
        { name: 'diff-reader', path: './skills/universal/diff-reader' },
        { name: 'repo-navigator', path: './skills/universal/repo-navigator' },
      ],
      hosts: {
        claude_code: [
          { name: 'diff-reader', path: './skills/claude_code/diff-reader' },
        ],
      },
    });

    expect(resolveSkillsForHost(manifest, 'claude_code')).toEqual([
      { name: 'diff-reader', path: './skills/claude_code/diff-reader' },
      { name: 'repo-navigator', path: './skills/universal/repo-navigator' },
    ]);
  });

  it('appends host-only skills after universal skills', () => {
    const manifest = createManifest({
      universal: [
        { name: 'repo-navigator', path: './skills/universal/repo-navigator' },
      ],
      hosts: {
        codex: [
          { name: 'diff-reader', path: './skills/codex/diff-reader' },
        ],
      },
    });

    expect(resolveSkillsForHost(manifest, 'codex')).toEqual([
      { name: 'repo-navigator', path: './skills/universal/repo-navigator' },
      { name: 'diff-reader', path: './skills/codex/diff-reader' },
    ]);
  });
});
