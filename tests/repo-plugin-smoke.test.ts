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
      'spwnr-dev',
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
      'EnterWorktree',
      'ExitWorktree',
      'resolve-workers',
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
      'single-lane',
      'team',
      'swarm',
      'CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1',
      '/plugin install spwnr@spwnr-dev',
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

  it('encode plan-first execution guards, worker recovery, and team or swarm contracts', () => {
    const gitignore = readFileSync(resolve(repoRoot, '.gitignore'), 'utf-8');
    const planCommand = readFileSync(resolve(repoRoot, 'commands/plan.md'), 'utf-8');
    const taskCommand = readFileSync(resolve(repoRoot, 'commands/task.md'), 'utf-8');
    const workersCommand = readFileSync(resolve(repoRoot, 'commands/workers.md'), 'utf-8');
    const sessionStartHook = readFileSync(resolve(repoRoot, 'hooks/session-start'), 'utf-8');
    const hooksJson = readFileSync(resolve(repoRoot, 'hooks/hooks.json'), 'utf-8');
    const foundationSkill = readFileSync(resolve(repoRoot, 'skills/workflow-foundation/SKILL.md'), 'utf-8');
    const planningSkill = readFileSync(resolve(repoRoot, 'skills/workflow-planning/SKILL.md'), 'utf-8');
    const taskSkill = readFileSync(resolve(repoRoot, 'skills/workflow-task-orchestration/SKILL.md'), 'utf-8');
    const workerAuditSkill = readFileSync(resolve(repoRoot, 'skills/worker-audit/SKILL.md'), 'utf-8');
    const workflowSkill = readFileSync(resolve(repoRoot, 'skills/using-spwnr-workflow/SKILL.md'), 'utf-8');

    expect(gitignore).toContain('.claude/plans/');

    expect(planCommand).toContain('Skill');
    expect(planCommand).toContain('AskUserQuestion');
    expect(planCommand).toContain('TodoWrite');
    expect(planCommand).toContain('Read');
    expect(planCommand).toContain('Write');
    expect(planCommand).toContain('Edit');
    expect(planCommand).toContain('Execution Units');
    expect(planCommand).toContain('never call `TaskCreate`');
    expect(planCommand).toContain('never call `SendMessage`');
    expect(planCommand).toContain('never create tasks, teams, or agents');
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
    expect(taskCommand).toContain('EnterWorktree');
    expect(taskCommand).toContain('ExitWorktree');
    expect(taskCommand).toContain('single-lane');
    expect(taskCommand).toContain('team');
    expect(taskCommand).toContain('swarm');
    expect(taskCommand).toContain('/spwnr:workers');
    expect(taskCommand).toContain('install or inject');
    expect(taskCommand).toContain('active revision');
    expect(taskCommand).not.toContain('parallel');

    expect(workersCommand).toContain('registry health and readiness audit');
    expect(workersCommand).toContain('install or inject recovery surface');
    expect(workersCommand).toContain('/spwnr:task');

    expect(foundationSkill).toContain('Load the primary workflow skill with `Skill`');
    expect(foundationSkill).toContain('Use `AskUserQuestion`');
    expect(foundationSkill).toContain('Use `TodoWrite`');
    expect(foundationSkill).toContain('Persist the shared plan artifact');
    expect(foundationSkill).toContain('latest active plan revision');
    expect(foundationSkill).toContain('Do not call `Agent`, `TaskCreate`, `TaskGet`, `TaskList`, `TaskUpdate`, `TeamCreate`, `TeamDelete`, `SendMessage`, `EnterWorktree`, or `ExitWorktree`');

    expect(planningSkill).toContain('## Planning Tool Protocol');
    expect(planningSkill).toContain('<HARD-GATE>');
    expect(planningSkill).toContain('Do NOT create any task');
    expect(planningSkill).toContain('Do NOT create any team');
    expect(planningSkill).toContain('Do NOT derive any agent');
    expect(planningSkill).toContain('Do NOT enter any worktree');
    expect(planningSkill).toContain('Execution Units');
    expect(planningSkill).toContain('Environment And Preconditions');
    expect(planningSkill).toContain('Execution Strategy Recommendation');
    expect(planningSkill).toContain('Agent Capability Requirements');
    expect(planningSkill).toContain('Failure And Escalation Rules');
    expect(planningSkill).toContain('risk level');
    expect(planningSkill).toContain('file ownership hints');
    expect(planningSkill).toContain('worker plan approval');
    expect(planningSkill).toContain('## Execution Review Loop');
    expect(planningSkill).toContain('Plan Review Loop');
    expect(planningSkill).toContain('Revision Status');
    expect(planningSkill).toContain('Superseded By');
    expect(planningSkill).toContain('material re-plan');
    expect(planningSkill).toContain('latest active revision');
    expect(planningSkill).toContain('Do not recreate the old `needs-confirmation` or `approved-plan-ready` state machine in the plan file.');
    expect(planningSkill).toContain('`Execute current plan`');

    expect(taskSkill).toContain('## Planning Gate');
    expect(taskSkill).toContain('## Execution Task Contract');
    expect(taskSkill).toContain('## Worker Readiness Required');
    expect(taskSkill).toContain('## Failure Recovery Contract');
    expect(taskSkill).toContain('TaskCreate');
    expect(taskSkill).toContain('TaskGet');
    expect(taskSkill).toContain('TaskList');
    expect(taskSkill).toContain('TaskUpdate');
    expect(taskSkill).toContain('TeamCreate');
    expect(taskSkill).toContain('SendMessage');
    expect(taskSkill).toContain('TeamDelete');
    expect(taskSkill).toContain('EnterWorktree');
    expect(taskSkill).toContain('ExitWorktree');
    expect(taskSkill).toContain('single-lane');
    expect(taskSkill).toContain('team');
    expect(taskSkill).toContain('swarm');
    expect(taskSkill).toContain('execution tasks');
    expect(taskSkill).toContain('latest active revision');
    expect(taskSkill).toContain('fresh task graph');
    expect(taskSkill).toContain('superseded');
    expect(taskSkill).toContain('install or inject the missing agents');
    expect(taskSkill).toContain('CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1');
    expect(taskSkill).toContain('current run');
    expect(taskSkill).toContain('Approved Execution Spec');
    expect(taskSkill).toContain('Owner: <agent-name|controller|unassigned>');
    expect(taskSkill).toContain('Files: <csv scope or none>');
    expect(taskSkill).toContain('Claim-Policy: <assigned|self-claim>');
    expect(taskSkill).toContain('Heartbeat: <interval>');
    expect(taskSkill).toContain('Risk: <low|medium|high>');
    expect(taskSkill).toContain('Plan-Approval: <not-required|required|approved>');
    expect(taskSkill).toContain('per-unit coverage');
    expect(taskSkill).toContain('High-risk tasks must not complete while `Plan-Approval:` is still `required`.');
    expect(taskSkill).toContain('Do not bypass a failed `TaskCreate` by directly executing the work.');
    expect(taskSkill).not.toContain('parallel');

    expect(workerAuditSkill).toContain('health-check and recovery surface');
    expect(workerAuditSkill).toContain('install or inject');
    expect(workerAuditSkill).toContain('return to the same active revision');
    expect(workerAuditSkill).toContain('Do not silently invent a fallback agent lineup');

    expect(workflowSkill).toContain('Use `workflow-planning` as the primary skill');
    expect(workflowSkill).toContain('align and lock the plan before any execution');
    expect(workflowSkill).toContain('active revision');
    expect(workflowSkill).toContain('Read');
    expect(workflowSkill).toContain('Edit');
    expect(workflowSkill).toContain('TaskCreate');
    expect(workflowSkill).toContain('TeamCreate');
    expect(workflowSkill).toContain('SendMessage');
    expect(workflowSkill).toContain('EnterWorktree');
    expect(workflowSkill).toContain('ExitWorktree');
    expect(workflowSkill).toContain('CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1');
    expect(workflowSkill).toContain('Execute current plan');
    expect(workflowSkill).toContain('Owner');
    expect(workflowSkill).toContain('Plan-Approval');
    expect(workflowSkill).not.toContain('parallel');

    expect(sessionStartHook).toContain('/spwnr:plan');
    expect(sessionStartHook).toContain('Skill');
    expect(sessionStartHook).toContain('AskUserQuestion');
    expect(sessionStartHook).toContain('TodoWrite');
    expect(sessionStartHook).toContain('Read');
    expect(sessionStartHook).toContain('Write');
    expect(sessionStartHook).toContain('Edit');
    expect(sessionStartHook).toContain('TaskCreate');
    expect(sessionStartHook).toContain('TaskGet');
    expect(sessionStartHook).toContain('TaskList');
    expect(sessionStartHook).toContain('TaskUpdate');
    expect(sessionStartHook).toContain('TeamCreate');
    expect(sessionStartHook).toContain('SendMessage');
    expect(sessionStartHook).toContain('TeamDelete');
    expect(sessionStartHook).toContain('EnterWorktree');
    expect(sessionStartHook).toContain('ExitWorktree');
    expect(sessionStartHook).toContain('single-lane, team, or swarm');
    expect(sessionStartHook).toContain('worker-readiness recovery message');
    expect(sessionStartHook).toContain('Approved Execution Spec');
    expect(sessionStartHook).toContain('Owner, Files, Claim-Policy, Heartbeat, Risk, and Plan-Approval');
    expect(sessionStartHook).toContain('--unit briefs');
    expect(sessionStartHook).toContain('latest active revision');
    expect(sessionStartHook).toContain('Execute current plan');
    expect(sessionStartHook).not.toContain('parallel');

    expect(hooksJson).toContain('TaskCreated');
    expect(hooksJson).toContain('TaskCompleted');
    expect(hooksJson).toContain('TeammateIdle');
    expect(hooksJson).toContain('PermissionDenied');
    expect(hooksJson).toContain('Stop');
    expect(hooksJson).toContain('runtime-guard.mjs');
  });

  it('encode request normalization and implementation-oriented execution standards in controller prompts', () => {
    const foundationSkill = readFileSync(resolve(repoRoot, 'skills/workflow-foundation/SKILL.md'), 'utf-8');
    const taskSkill = readFileSync(resolve(repoRoot, 'skills/workflow-task-orchestration/SKILL.md'), 'utf-8');

    expect(foundationSkill).toContain("Translate the user's raw wording into a structured task brief");
    expect(foundationSkill).toContain('Do not require the user to rewrite the prompt');
    expect(foundationSkill).toContain('decision-support materials');
    expect(foundationSkill).toContain('2 to 4 concrete options');

    expect(taskSkill).toContain('normalized registry lookup brief');
    expect(taskSkill).toContain('per-unit coverage brief');
    expect(taskSkill).toContain('evaluation dimensions');
    expect(taskSkill).toContain('risk boundaries');
    expect(taskSkill).toContain('smallest lineup that still covers every execution unit');
    expect(taskSkill).toContain('Tailor the output contract to the selected package\'s job');
    expect(taskSkill).toContain('single-lane');
    expect(taskSkill).toContain('team');
    expect(taskSkill).toContain('swarm');
  });
});
