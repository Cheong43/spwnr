import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadPackage, validatePackageLayout } from '../packages/manifest-schema/src/index.ts';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(__dirname, '..');

function readJson(relativePath: string) {
  return JSON.parse(readFileSync(resolve(repoRoot, relativePath), 'utf-8'));
}

describe('repo-root Claude plugin', () => {
  it('ships valid plugin, marketplace, and worker JSON files', () => {
    const plugin = readJson('.claude-plugin/plugin.json');
    const marketplace = readJson('.claude-plugin/marketplace.json');
    const workers = readJson('.claude-plugin/workers.json');
    const hooks = readJson('hooks/hooks.json');

    expect(plugin).toMatchObject({
      name: 'spwnr-workflow',
      version: '0.1.0',
      hooks: './hooks/hooks.json',
    });
    expect(marketplace).toMatchObject({
      name: 'spwnr-dev',
      plugins: [
        expect.objectContaining({
          name: 'spwnr-workflow',
          source: './',
          version: '0.1.0',
        }),
      ],
    });
    expect(workers).toMatchObject({
      roles: {
        research: {
          required: true,
          preferredAgents: ['general-researcher'],
        },
        execute: {
          required: true,
          preferredAgents: ['general-executor'],
        },
        review: {
          required: true,
          preferredAgents: ['general-reviewer'],
          fallbackAgents: ['code-reviewer'],
        },
      },
    });
    expect(hooks).toMatchObject({
      hooks: {
        SessionStart: [
          expect.objectContaining({
            matcher: 'startup|clear|compact',
          }),
        ],
      },
    });
  });

  it('includes the expected plugin structure files', () => {
    const requiredPaths = [
      '.claude-plugin/plugin.json',
      '.claude-plugin/marketplace.json',
      '.claude-plugin/workers.json',
      'commands/plan.md',
      'commands/task.md',
      'commands/workers.md',
      'hooks/hooks.json',
      'hooks/session-start',
      'skills/using-spwnr-workflow/SKILL.md',
      'skills/worker-selection/SKILL.md',
      'skills/task-decomposition/SKILL.md',
      'skills/handoff-review/SKILL.md',
    ];

    for (const requiredPath of requiredPaths) {
      expect(existsSync(resolve(repoRoot, requiredPath)), requiredPath).toBe(true);
    }
  });
});

describe('workflow worker examples', () => {
  const packages = [
    'examples/code-reviewer',
    'examples/general-researcher',
    'examples/general-executor',
    'examples/general-reviewer',
  ];

  it.each(packages)('%s loads and validates', (packageDir) => {
    const absoluteDir = resolve(repoRoot, packageDir);
    const loaded = loadPackage(absoluteDir);

    expect(loaded.success).toBe(true);
    if (!loaded.success) {
      return;
    }

    expect(validatePackageLayout(absoluteDir, loaded.result.manifest, { strict: true })).toEqual([]);
  });
});

describe('workflow docs', () => {
  it('reference the plugin commands, marketplace, and worker packages', () => {
    const combinedDocs = [
      readFileSync(resolve(repoRoot, 'README.md'), 'utf-8'),
      readFileSync(resolve(repoRoot, 'docs/guide/claude-plugin-workflow.md'), 'utf-8'),
    ].join('\n');

    for (const expectedSnippet of [
      'spwnr-workflow',
      'spwnr-dev',
      '/spwnr-workflow:plan',
      '/spwnr-workflow:task',
      '/spwnr-workflow:workers',
      'general-researcher',
      'general-executor',
      'general-reviewer',
      '/plugin install spwnr-workflow@spwnr-dev',
      'claude --plugin-dir /absolute/path/to/spwnr',
    ]) {
      expect(combinedDocs).toContain(expectedSnippet);
    }
  });
});
