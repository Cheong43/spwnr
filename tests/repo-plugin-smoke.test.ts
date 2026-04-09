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
      name: 'spwnr',
      version: '0.1.0',
      hooks: './hooks/hooks.json',
    });
    expect(marketplace).toMatchObject({
      name: 'spwnr-dev',
      plugins: [
        expect.objectContaining({
          name: 'spwnr',
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
      'skills/workflow-foundation/SKILL.md',
      'skills/workflow-planning/SKILL.md',
      'skills/workflow-task-orchestration/SKILL.md',
      'skills/worker-audit/SKILL.md',
      'skills/using-spwnr-workflow/SKILL.md',
    ];

    for (const requiredPath of requiredPaths) {
      expect(existsSync(resolve(repoRoot, requiredPath)), requiredPath).toBe(true);
    }

    for (const removedPath of [
      'skills/worker-selection/SKILL.md',
      'skills/task-decomposition/SKILL.md',
      'skills/handoff-review/SKILL.md',
    ]) {
      expect(existsSync(resolve(repoRoot, removedPath)), removedPath).toBe(false);
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
      'spwnr',
      'spwnr-dev',
      '/spwnr:plan',
      '/spwnr:task',
      '/spwnr:workers',
      'general-researcher',
      'general-executor',
      'general-reviewer',
      '/plugin install spwnr@spwnr-dev',
      'claude --plugin-dir /absolute/path/to/spwnr',
    ]) {
      expect(combinedDocs).toContain(expectedSnippet);
    }
  });

  it('require option-based clarification in planning and task prompts', () => {
    const planCommand = readFileSync(resolve(repoRoot, 'commands/plan.md'), 'utf-8');
    const taskCommand = readFileSync(resolve(repoRoot, 'commands/task.md'), 'utf-8');
    const workersCommand = readFileSync(resolve(repoRoot, 'commands/workers.md'), 'utf-8');
    const foundationSkill = readFileSync(resolve(repoRoot, 'skills/workflow-foundation/SKILL.md'), 'utf-8');
    const planningSkill = readFileSync(resolve(repoRoot, 'skills/workflow-planning/SKILL.md'), 'utf-8');
    const taskSkill = readFileSync(resolve(repoRoot, 'skills/workflow-task-orchestration/SKILL.md'), 'utf-8');
    const workerAuditSkill = readFileSync(resolve(repoRoot, 'skills/worker-audit/SKILL.md'), 'utf-8');
    const workflowSkill = readFileSync(resolve(repoRoot, 'skills/using-spwnr-workflow/SKILL.md'), 'utf-8');

    expect(planCommand).toContain('workflow-planning');
    expect(taskCommand).toContain('workflow-task-orchestration');
    expect(workersCommand).toContain('worker-audit');
    expect(planCommand).not.toContain('task-decomposition');
    expect(taskCommand).not.toContain('handoff-review');
    expect(workersCommand).not.toContain('worker-selection');
    expect(foundationSkill).toContain('2 to 4 concrete options');
    expect(foundationSkill).toContain('Compare at least 2 plausible approaches');
    expect(foundationSkill).toContain('provisional default');
    expect(planningSkill).toContain('Approach Analysis');
    expect(planningSkill).toContain('Do not leave the plan blank');
    expect(taskSkill).toContain('Handoff Contracts');
    expect(taskSkill).toContain('Route blocking review feedback back through the execute step once');
    expect(workerAuditSkill).toContain('Worker Mapping');
    expect(workerAuditSkill).toContain('preferredAgents');
    expect(workerAuditSkill).toContain('Do not silently replace a missing required worker');
    expect(workflowSkill).toContain('Use `workflow-planning` as the primary skill');
    expect(workflowSkill).not.toContain('compare plausible approaches');
    expect(workflowSkill).not.toContain('recommended default');
  });

  it('encode request normalization and deep analysis standards in controller and worker prompts', () => {
    const foundationSkill = readFileSync(resolve(repoRoot, 'skills/workflow-foundation/SKILL.md'), 'utf-8');
    const taskSkill = readFileSync(resolve(repoRoot, 'skills/workflow-task-orchestration/SKILL.md'), 'utf-8');
    const researcherAgent = readFileSync(resolve(repoRoot, 'examples/general-researcher/agent.md'), 'utf-8');
    const researchSkill = readFileSync(resolve(repoRoot, 'examples/general-researcher/skills/universal/evidence-gathering/SKILL.md'), 'utf-8');
    const executorAgent = readFileSync(resolve(repoRoot, 'examples/general-executor/agent.md'), 'utf-8');
    const executorSkill = readFileSync(resolve(repoRoot, 'examples/general-executor/skills/universal/structured-delivery/SKILL.md'), 'utf-8');
    const reviewerAgent = readFileSync(resolve(repoRoot, 'examples/general-reviewer/agent.md'), 'utf-8');
    const reviewerSkill = readFileSync(resolve(repoRoot, 'examples/general-reviewer/skills/universal/quality-gate/SKILL.md'), 'utf-8');

    expect(foundationSkill).toContain("Translate the user's raw wording into a structured task brief");
    expect(foundationSkill).toContain('Do not require the user to rewrite the prompt');
    expect(foundationSkill).toContain('decision-support materials');

    expect(taskSkill).toContain('Produce a short plan and a normalized worker brief');
    expect(taskSkill).toContain('evaluation dimensions, evidence gaps, and key uncertainties');
    expect(taskSkill).toContain('decision-support materials rather than a final directive');
    expect(taskSkill).toContain('keep the execution output concrete and implementation-oriented');

    expect(researcherAgent).toContain('decision goal, evaluation criteria, time horizon, constraints, comparable options, and risk surface');
    expect(researcherAgent).toContain('create the framework first, then fill it with evidence');
    expect(researcherAgent).toContain('Default to comparing multiple viable options');

    expect(researchSkill).toContain('normalized task framing');
    expect(researchSkill).toContain('evidence tiers: confirmed facts, reasoned inference, and open gaps');

    expect(executorAgent).toContain('professional decision-support artifact');
    expect(executorAgent).toContain('options or candidates, key evidence, major risks, and next-step diligence');
    expect(executorAgent).toContain('support the decision without pretending to make the final choice');

    expect(executorSkill).toContain('conclusion summary');
    expect(executorSkill).toContain('candidate options or scenario comparison');
    expect(executorSkill).toContain('decision-support materials instead of a final directive');

    expect(reviewerAgent).toContain('shallow analysis');
    expect(reviewerAgent).toContain('broken evidence chains');
    expect(reviewerAgent).toContain('material risks or boundaries');

    expect(reviewerSkill).toContain('unsupported claims or a missing evidence chain');
    expect(reviewerSkill).toContain('missing risk or boundary statements');
  });
});
