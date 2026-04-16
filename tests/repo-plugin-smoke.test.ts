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
  it('ships valid plugin, marketplace, worker, and hook JSON files', () => {
    const plugin = readJson('.claude-plugin/plugin.json');
    const marketplace = readJson('.claude-plugin/marketplace.json');
    const repoPackage = readJson('package.json');
    const workers = readJson('.claude-plugin/workers.json');
    const hooks = readJson('hooks/hooks.json');

    expect(plugin).toMatchObject({
      name: 'spwnr',
      version: '0.3.0',
    });
    expect(plugin).not.toHaveProperty('hooks');
    expect(marketplace).toMatchObject({
      name: 'spwnr',
      plugins: [
        expect.objectContaining({
          name: 'spwnr',
          source: './',
          version: '0.3.0',
        }),
      ],
    });
    expect(repoPackage).toMatchObject({
      name: 'spwnr',
      version: '0.3.0',
    });
    expect(workers).toMatchObject({
      selectionMode: 'dynamic',
      registrySource: 'local',
      selectionMethod: 'llm_choose',
      missingPolicy: 'auto_install_local',
      lineup: {
        minAgents: 1,
        maxAgents: 4,
      },
    });
    expect(hooks).toMatchObject({
      hooks: {
        SessionStart: [
          expect.objectContaining({
            matcher: 'startup|clear|compact',
          }),
        ],
        TaskCreated: [expect.any(Object)],
        TaskCompleted: [expect.any(Object)],
        TeammateIdle: [expect.any(Object)],
        PermissionDenied: [expect.any(Object)],
        Stop: [expect.any(Object)],
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
      'hooks/runtime-guard.mjs',
      'hooks/lib/runtime-guard.mjs',
      'skills/workflow-foundation/SKILL.md',
      'skills/workflow-planning/SKILL.md',
      'skills/workflow-task-orchestration/SKILL.md',
      'skills/workflow-task-with-team/SKILL.md',
      'skills/workflow-task-with-pipeline/SKILL.md',
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
  it('reference the plugin commands, marketplace, and exact Claude tool names', () => {
    const combinedDocs = [
      readFileSync(resolve(repoRoot, 'README.md'), 'utf-8'),
      readFileSync(resolve(repoRoot, 'docs/guide/claude-plugin-workflow.md'), 'utf-8'),
    ].join('\n');

    for (const expectedSnippet of [
      'spwnr',
      '/spwnr:plan',
      '/spwnr:task',
      '/spwnr:workers',
      '.claude/plans/spwnr-',
      '-r2.md',
      'registry-guided',
      'Skill',
      'AskUserQuestion',
      'TodoWrite',
      'Read',
      'Write',
      'Edit',
      'Agent',
      'TaskCreate',
      'TaskGet',
      'TaskList',
      'TaskUpdate',
      'TeamCreate',
      'SendMessage',
      'TeamDelete',
      'resolve-workers',
      'Expert Planning Round',
      'Worker Readiness Required',
      'research -> draft -> review',
      'sync-registry',
      'Plan Review Loop',
      'Approved Execution Spec',
      'Revision Status',
      'Superseded By',
      'active revision',
      'material re-plan',
      'Execute current plan',
      'Continue improving plan',
      'End this round',
      'current run',
      'pipeline',
      'team',
      'workflow-task-with-pipeline',
      'workflow-task-with-team',
      'CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1',
      '/plugin install spwnr@spwnr',
      'claude --plugin-dir /absolute/path/to/spwnr',
    ]) {
      expect(combinedDocs).toContain(expectedSnippet);
    }

    for (const removedSnippet of [
      'SkillTool',
      'AskUserQuestionTool',
      'TodoWriteTool',
      'FileReadTool',
      'FileWriteTool',
      'FileEditTool',
      'AgentTool',
      'TaskCreateTool',
      'TaskGetTool',
      'TaskListTool',
      'TaskUpdateTool',
      'TeamCreateTool',
      'TeamDeleteTool',
      'EnterWorktreeTool',
      'ExitWorktreeTool',
      '`parallel`',
    ]) {
      expect(combinedDocs).not.toContain(removedSnippet);
    }
  });

  it('encode plan-first execution guards, worker recovery, and team contracts', () => {
    const gitignore = readFileSync(resolve(repoRoot, '.gitignore'), 'utf-8');
    const planCommand = readFileSync(resolve(repoRoot, 'commands/plan.md'), 'utf-8');
    const taskCommand = readFileSync(resolve(repoRoot, 'commands/task.md'), 'utf-8');
    const workersCommand = readFileSync(resolve(repoRoot, 'commands/workers.md'), 'utf-8');
    const sessionStartHook = readFileSync(resolve(repoRoot, 'hooks/session-start'), 'utf-8');
    const hooksJson = readFileSync(resolve(repoRoot, 'hooks/hooks.json'), 'utf-8');
    const foundationSkill = readFileSync(resolve(repoRoot, 'skills/workflow-foundation/SKILL.md'), 'utf-8');
    const planningSkill = readFileSync(resolve(repoRoot, 'skills/workflow-planning/SKILL.md'), 'utf-8');
    const taskRouterSkill = readFileSync(resolve(repoRoot, 'skills/workflow-task-orchestration/SKILL.md'), 'utf-8');
    const taskTeamSkill = readFileSync(resolve(repoRoot, 'skills/workflow-task-with-team/SKILL.md'), 'utf-8');
    const taskPipelineSkill = readFileSync(resolve(repoRoot, 'skills/workflow-task-with-pipeline/SKILL.md'), 'utf-8');
    const workerAuditSkill = readFileSync(resolve(repoRoot, 'skills/worker-audit/SKILL.md'), 'utf-8');
    const workflowSkill = readFileSync(resolve(repoRoot, 'skills/using-spwnr-workflow/SKILL.md'), 'utf-8');

    expect(gitignore).toContain('.claude/plans/');

    expect(planCommand).toContain('Skill');
    expect(planCommand).toContain('AskUserQuestion');
    expect(planCommand).toContain('TodoWrite');
    expect(planCommand).toContain('Read');
    expect(planCommand).toContain('Write');
    expect(planCommand).toContain('Edit');
    expect(planCommand).toContain('resolve-workers');
    expect(planCommand).toContain('planning-only experts');
    expect(planCommand).toContain('`research`, `draft`, and `review`');
    expect(planCommand).toContain('Expert Planning Round');
    expect(planCommand).toContain('Worker Readiness Required');
    expect(planCommand).toContain('Execution Units');
    expect(planCommand).toContain('never call `TaskCreate`');
    expect(planCommand).toContain('never call `SendMessage`');
    expect(planCommand).toContain('never create tasks or teams from this command');
    expect(planCommand).not.toContain('TaskCreateTool');

    expect(taskCommand).toContain('Read');
    expect(taskCommand).toContain('Edit');
    expect(taskCommand).toContain('TaskCreate');
    expect(taskCommand).toContain('TaskGet');
    expect(taskCommand).toContain('TaskList');
    expect(taskCommand).toContain('TaskUpdate');
    expect(taskCommand).toContain('TeamCreate');
    expect(taskCommand).toContain('SendMessage');
    expect(taskCommand).toContain('Agent');
    expect(taskCommand).toContain('TeamDelete');
    expect(taskCommand).toContain('pipeline');
    expect(taskCommand).toContain('team');
    expect(taskCommand).toContain('workflow-task-with-pipeline');
    expect(taskCommand).toContain('workflow-task-with-team');
    expect(taskCommand).toContain('/spwnr:workers');
    expect(taskCommand).toContain('install or inject');
    expect(taskCommand).toContain('active revision');
    expect(taskCommand).not.toContain('`parallel`');

    expect(workersCommand).toContain('registry health and readiness audit');
    expect(workersCommand).toContain('install or inject recovery surface');
    expect(workersCommand).toContain('/spwnr:task');

    expect(foundationSkill).toContain('Load the primary workflow skill with `Skill`');
    expect(foundationSkill).toContain('Use `AskUserQuestion`');
    expect(foundationSkill).toContain('Use `TodoWrite`');
    expect(foundationSkill).toContain('Persist the shared plan artifact');
    expect(foundationSkill).toContain('latest active plan revision');
    expect(foundationSkill).toContain('planning-only `Agent` pass is allowed only after a draft plan is visible');
    expect(foundationSkill).toContain('Do not call `TaskCreate`, `TaskGet`, `TaskList`, `TaskUpdate`, `TeamCreate`, `TeamDelete`, or `SendMessage`');

    expect(planningSkill).toContain('## Planning Tool Protocol');
    expect(planningSkill).toContain('## <HARD-GATE>');
    expect(planningSkill).toContain('Do NOT create any task');
    expect(planningSkill).toContain('Do NOT create any team');
    expect(planningSkill).toContain('You MAY derive planning-only experts with `Agent`');
    expect(planningSkill).toContain('Do NOT enter any worktree');
    expect(planningSkill).toContain('## Planning Expert Loop');
    expect(planningSkill).toContain('resolve-workers');
    expect(planningSkill).toContain('Expert Planning Round');
    expect(planningSkill).toContain('Worker Readiness Required');
    expect(planningSkill).toContain('`research`, `draft`, and `review`');
    expect(planningSkill).toContain('Execution Units');
    expect(planningSkill).toContain('Environment And Preconditions');
    expect(planningSkill).toContain('Execution Strategy Recommendation');
    expect(planningSkill).toContain('Agent Capability Requirements');
    expect(planningSkill).toContain('Failure And Escalation Rules');
    expect(planningSkill).toContain('risk level');
    expect(planningSkill).toContain('file ownership hints');
    expect(planningSkill).toContain('worker plan approval');
    expect(planningSkill).toContain('pattern name');
    expect(planningSkill).toContain('multiple pipelines in parallel');
    expect(planningSkill).toContain('## Execution Review Loop');
    expect(planningSkill).toContain('Plan Review Loop');
    expect(planningSkill).toContain('Revision Status');
    expect(planningSkill).toContain('Superseded By');
    expect(planningSkill).toContain('material re-plan');
    expect(planningSkill).toContain('latest active revision');
    expect(planningSkill).toContain('Do not recreate the old `needs-confirmation` or `approved-plan-ready` state machine in the plan file.');
    expect(planningSkill).toContain('`Execute current plan`');
    expect(planningSkill).not.toContain('Do NOT derive any agent.');

    expect(taskRouterSkill).toContain('## Planning Gate');
    expect(taskRouterSkill).toContain('## Approved Execution Spec');
    expect(taskRouterSkill).toContain('## Routing Decision');
    expect(taskRouterSkill).toContain('## Worker Readiness Required');
    expect(taskRouterSkill).toContain('## Failure Recovery Contract');
    expect(taskRouterSkill).toContain('TaskCreate');
    expect(taskRouterSkill).toContain('TaskGet');
    expect(taskRouterSkill).toContain('TaskList');
    expect(taskRouterSkill).toContain('TaskUpdate');
    expect(taskRouterSkill).toContain('TeamCreate');
    expect(taskRouterSkill).toContain('SendMessage');
    expect(taskRouterSkill).toContain('TeamDelete');
    expect(taskRouterSkill).toContain('pipeline');
    expect(taskRouterSkill).toContain('team');
    expect(taskRouterSkill).toContain('workflow-task-with-pipeline');
    expect(taskRouterSkill).toContain('workflow-task-with-team');
    expect(taskRouterSkill).toContain('latest active revision');
    expect(taskRouterSkill).toContain('superseded');
    expect(taskRouterSkill).toContain('install or inject the missing agents');
    expect(taskRouterSkill).toContain('CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1');
    expect(taskRouterSkill).toContain('current run');
    expect(taskRouterSkill).toContain('Approved Execution Spec');
    expect(taskRouterSkill).toContain('per-unit coverage');
    expect(taskRouterSkill).not.toContain('`parallel`');

    expect(taskTeamSkill).toContain('## Team Topology');
    expect(taskTeamSkill).toContain('TaskCreate');
    expect(taskTeamSkill).toContain('TeamCreate');
    expect(taskTeamSkill).toContain('SendMessage');
    expect(taskTeamSkill).toContain('TeamDelete');
    expect(taskTeamSkill).toContain('multiple bounded pipelines in parallel');
    expect(taskTeamSkill).toContain('CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1');
    expect(taskTeamSkill).toContain('High-risk tasks must not complete while `Plan-Approval:` is still `required`.');
    expect(taskTeamSkill).not.toContain('`parallel`');

    expect(taskPipelineSkill).toContain('## Pipeline Topology');
    expect(taskPipelineSkill).toContain('TaskCreate');
    expect(taskPipelineSkill).toContain('TaskGet');
    expect(taskPipelineSkill).toContain('TaskList');
    expect(taskPipelineSkill).toContain('TaskUpdate');
    expect(taskPipelineSkill).toContain('pipeline pattern');
    expect(taskPipelineSkill).toContain('stage-to-capability mapping');
    expect(taskPipelineSkill).toContain('handoff artifact');
    expect(taskPipelineSkill).toContain('pipeline');
    expect(taskPipelineSkill).not.toContain('TeamCreate');
    expect(taskPipelineSkill).not.toContain('`parallel`');

    expect(foundationSkill).toContain('## Execution Task Contract');
    expect(foundationSkill).toContain('## Execution Strategy Recommendation Contract');
    expect(foundationSkill).toContain('pattern name');
    expect(foundationSkill).toContain('multiple bounded pipelines in parallel');
    expect(foundationSkill).toContain('Owner: <agent-name|controller|unassigned>');
    expect(foundationSkill).toContain('Files: <csv scope or none>');
    expect(foundationSkill).toContain('Claim-Policy: <assigned|self-claim>');
    expect(foundationSkill).toContain('Risk: <low|medium|high>');
    expect(foundationSkill).toContain('Plan-Approval: <not-required|required|approved>');
    expect(foundationSkill).toContain('Mode: <pipeline|team>');
    expect(foundationSkill).toContain('### Compatibility Matrix');
    expect(foundationSkill).toContain('`Claim-Policy: assigned` -> `Owner` must be a concrete owner');
    expect(foundationSkill).toContain('`Claim-Policy: self-claim` -> `Owner` must start as exactly `unassigned`');
    expect(foundationSkill).toContain('`Risk: high` -> `Plan-Approval` must be `required` or `approved`; never use `not-required`');
    expect(foundationSkill).toContain('### TaskCreate Preflight');
    expect(foundationSkill).toContain('Before the first `TaskCreate`, the controller must check every draft task description against this exact checklist:');

    expect(workerAuditSkill).toContain('health-check and recovery surface');
    expect(workerAuditSkill).toContain('install or inject');
    expect(workerAuditSkill).toContain('return to the same active revision');
    expect(workerAuditSkill).toContain('Do not silently invent a fallback agent lineup');

    expect(workflowSkill).toContain('Use `workflow-planning` as the primary skill');
    expect(workflowSkill).toContain('align and lock the plan before any execution');
    expect(workflowSkill).toContain('planning expert loop');
    expect(workflowSkill).toContain('Worker Readiness Required');
    expect(workflowSkill).toContain('`research`, `draft`, and `review`');
    expect(workflowSkill).toContain('active revision');
    expect(workflowSkill).toContain('Read');
    expect(workflowSkill).toContain('Edit');
    expect(workflowSkill).toContain('workflow-task-with-pipeline');
    expect(workflowSkill).toContain('workflow-task-with-team');
    expect(workflowSkill).toContain('pipeline');
    expect(workflowSkill).toContain('TeamCreate');
    expect(workflowSkill).toContain('SendMessage');
    expect(workflowSkill).toContain('CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1');
    expect(workflowSkill).toContain('Execute current plan');
    expect(workflowSkill).toContain('Owner');
    expect(workflowSkill).toContain('Plan-Approval');
    expect(workflowSkill).not.toContain('`parallel`');

    expect(sessionStartHook).toContain('/spwnr:plan');
    expect(sessionStartHook).toContain('Skill');
    expect(sessionStartHook).toContain('AskUserQuestion');
    expect(sessionStartHook).toContain('TodoWrite');
    expect(sessionStartHook).toContain('Read');
    expect(sessionStartHook).toContain('Write');
    expect(sessionStartHook).toContain('Edit');
    expect(sessionStartHook).toContain('planning expert loop');
    expect(sessionStartHook).toContain('spwnr resolve-workers');
    expect(sessionStartHook).toContain('Worker Readiness Required');
    expect(sessionStartHook).toContain('planning-only');
    expect(sessionStartHook).toContain('TaskCreate');
    expect(sessionStartHook).toContain('TaskGet');
    expect(sessionStartHook).toContain('TaskList');
    expect(sessionStartHook).toContain('TaskUpdate');
    expect(sessionStartHook).toContain('TeamCreate');
    expect(sessionStartHook).toContain('SendMessage');
    expect(sessionStartHook).toContain('TeamDelete');
    expect(sessionStartHook).toContain('workflow-task-with-pipeline');
    expect(sessionStartHook).toContain('workflow-task-with-team');
    expect(sessionStartHook).toContain('pipeline');
    expect(sessionStartHook).toContain('multiple pipelines in parallel');
    expect(sessionStartHook).toContain('worker-readiness recovery message');
    expect(sessionStartHook).toContain('Approved Execution Spec');
    expect(sessionStartHook).toContain('Owner, Files, Claim-Policy, Risk, and Plan-Approval');
    expect(sessionStartHook).toContain('--unit briefs');
    expect(sessionStartHook).toContain('latest active revision');
    expect(sessionStartHook).toContain('Execute current plan');
    expect(sessionStartHook).not.toContain('`parallel`');

    expect(hooksJson).toContain('TaskCreated');
    expect(hooksJson).toContain('TaskCompleted');
    expect(hooksJson).toContain('TeammateIdle');
    expect(hooksJson).toContain('PermissionDenied');
    expect(hooksJson).toContain('Stop');
    expect(hooksJson).toContain('runtime-guard.mjs');
  });

  it('encode request normalization and implementation-oriented execution standards in controller prompts', () => {
    const foundationSkill = readFileSync(resolve(repoRoot, 'skills/workflow-foundation/SKILL.md'), 'utf-8');
    const taskRouterSkill = readFileSync(resolve(repoRoot, 'skills/workflow-task-orchestration/SKILL.md'), 'utf-8');
    const taskTeamSkill = readFileSync(resolve(repoRoot, 'skills/workflow-task-with-team/SKILL.md'), 'utf-8');
    const taskPipelineSkill = readFileSync(resolve(repoRoot, 'skills/workflow-task-with-pipeline/SKILL.md'), 'utf-8');

    expect(foundationSkill).toContain("Translate the user's raw wording into a structured task brief");
    expect(foundationSkill).toContain('Do not require the user to rewrite the prompt');
    expect(foundationSkill).toContain('decision-support materials');
    expect(foundationSkill).toContain('2 to 4 concrete options');

    expect(taskRouterSkill).toContain('normalized registry lookup brief');
    expect(taskRouterSkill).toContain('per-unit coverage brief');
    expect(taskRouterSkill).toContain('lineup that covers every execution unit');
    expect(taskRouterSkill).toContain('workflow-task-with-pipeline');
    expect(taskRouterSkill).toContain('workflow-task-with-team');
    expect(taskRouterSkill).toContain('pipeline');
    expect(taskRouterSkill).toContain('team');
    expect(taskRouterSkill).not.toContain('swarm');

    expect(taskTeamSkill).toContain('selected lineup and why each package was chosen');
    expect(taskTeamSkill).toContain('multiple bounded pipelines in parallel');
    expect(taskPipelineSkill).toContain('stage-to-capability mapping');
    expect(taskPipelineSkill).toContain('handoff artifact');
  });

  it('keep workflow skills within the 200-line host budget', () => {
    const countLines = (value: string): number => value.split('\n').length;

    const foundationSkill = readFileSync(resolve(repoRoot, 'skills/workflow-foundation/SKILL.md'), 'utf-8');
    const planningSkill = readFileSync(resolve(repoRoot, 'skills/workflow-planning/SKILL.md'), 'utf-8');
    const taskRouterSkill = readFileSync(resolve(repoRoot, 'skills/workflow-task-orchestration/SKILL.md'), 'utf-8');
    const taskTeamSkill = readFileSync(resolve(repoRoot, 'skills/workflow-task-with-team/SKILL.md'), 'utf-8');
    const taskPipelineSkill = readFileSync(resolve(repoRoot, 'skills/workflow-task-with-pipeline/SKILL.md'), 'utf-8');

    expect(countLines(foundationSkill)).toBeLessThanOrEqual(200);
    expect(countLines(planningSkill)).toBeLessThanOrEqual(200);
    expect(countLines(taskRouterSkill)).toBeLessThanOrEqual(200);
    expect(countLines(taskTeamSkill)).toBeLessThanOrEqual(200);
    expect(countLines(taskPipelineSkill)).toBeLessThanOrEqual(200);
  });
});
