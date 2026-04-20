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

function readText(relativePath: string) {
  return readFileSync(resolve(repoRoot, relativePath), 'utf-8');
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
      version: '0.3.4',
    });
    expect(plugin).not.toHaveProperty('hooks');
    expect(marketplace).toMatchObject({
      name: 'spwnr',
      plugins: [
        expect.objectContaining({
          name: 'spwnr',
          source: './',
          version: '0.3.4',
        }),
      ],
    });
    expect(repoPackage).toMatchObject({
      name: 'spwnr',
      version: '0.3.0',
      engines: {
        node: '>=22.0.0',
      },
    });
    expect(workers).toMatchObject({
      selectionMode: 'dynamic',
      registrySource: 'local',
      selectionMethod: 'llm_choose',
      missingPolicy: 'auto_install_local',
      lineup: {
        minAgents: 1,
        maxAgents: 20,
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

  it('pins the workspace TypeScript and package engines to the Node 22 / TS 5.9 baseline', () => {
    const packageJsonPaths = [
      'package.json',
      'apps/spwnr-cli/package.json',
      'packages/adapters/package.json',
      'packages/broker/package.json',
      'packages/core-types/package.json',
      'packages/injector/package.json',
      'packages/manifest-schema/package.json',
      'packages/memory/package.json',
      'packages/policy/package.json',
      'packages/registry/package.json',
    ];

    for (const packageJsonPath of packageJsonPaths) {
      const packageJson = readJson(packageJsonPath);
      expect(packageJson.engines).toMatchObject({
        node: '>=22.0.0',
      });

      if (packageJson.devDependencies?.typescript) {
        expect(packageJson.devDependencies.typescript).toBe('^5.9.3');
      }
    }

    const baseTsconfig = readJson('tsconfig.base.json');
    expect(baseTsconfig.compilerOptions).toMatchObject({
      verbatimModuleSyntax: true,
      noUncheckedIndexedAccess: true,
      exactOptionalPropertyTypes: true,
      skipLibCheck: true,
    });

    const cliTsconfig = readJson('apps/spwnr-cli/tsconfig.json');
    expect(cliTsconfig.compilerOptions).not.toHaveProperty('ignoreDeprecations');
  });

  it('declares the GitHub repository URL on every published package', () => {
    const publishedPackagePaths = [
      'package.json',
      'apps/spwnr-cli/package.json',
      'packages/adapters/package.json',
      'packages/core-types/package.json',
      'packages/injector/package.json',
      'packages/manifest-schema/package.json',
    ];

    for (const packageJsonPath of publishedPackagePaths) {
      const packageJson = readJson(packageJsonPath);
      expect(packageJson.repository).toMatchObject({
        type: 'git',
        url: 'git+https://github.com/Cheong43/spwnr.git',
      });
      expect(packageJson.provenance).toBe(true);
      if (packageJson.publishConfig) {
        expect(packageJson.publishConfig).toMatchObject({
          access: 'public',
          provenance: true,
        });
      }
    }
  });

  it('keeps the external registry submodule aligned with the canonical runtime package', () => {
    const registryPackage = readJson('packages/registry/package.json');
    expect(registryPackage.dependencies).not.toHaveProperty('better-sqlite3');
    expect(registryPackage.devDependencies).not.toHaveProperty('@types/better-sqlite3');
    expect(registryPackage.repository).toMatchObject({
      type: 'git',
      url: 'git+https://github.com/Cheong43/spwnr-registry.git',
    });
    expect(registryPackage.publishConfig).toMatchObject({
      access: 'public',
      provenance: true,
    });
    expect(registryPackage.provenance).toBe(true);

    const templateRegistryPackagePath = resolve(repoRoot, 'vendor/spwnr-registry/package.json');
    if (existsSync(templateRegistryPackagePath)) {
      const templateRegistryPackage = readJson('vendor/spwnr-registry/package.json');
      expect(templateRegistryPackage.dependencies).not.toHaveProperty('better-sqlite3');
      expect(templateRegistryPackage.devDependencies).not.toHaveProperty('@types/better-sqlite3');
      expect(templateRegistryPackage).toMatchObject({
        name: '@spwnr/registry',
        provenance: true,
        repository: {
          type: 'git',
          url: 'git+https://github.com/Cheong43/spwnr-registry.git',
        },
        publishConfig: {
          access: 'public',
          provenance: true,
        },
      });
      expect(templateRegistryPackage.name).toBe(registryPackage.name);
      return;
    }

    const gitmodules = readFileSync(resolve(repoRoot, '.gitmodules'), 'utf-8');
    expect(gitmodules).toContain('[submodule "vendor/spwnr-registry"]');
    expect(gitmodules).toContain('url = https://github.com/Cheong43/spwnr-registry.git');
  });

  it('keeps npm publishing scoped to the main repo package set and away from the external registry package', () => {
    const publishScript = readFileSync(resolve(repoRoot, 'scripts/publish-public-packages.mjs'), 'utf-8');

    expect(publishScript).toContain("'packages/core-types/package.json'");
    expect(publishScript).toContain("'packages/adapters/package.json'");
    expect(publishScript).toContain("'packages/manifest-schema/package.json'");
    expect(publishScript).toContain("'packages/injector/package.json'");
    expect(publishScript).toContain("'apps/spwnr-cli/package.json'");
    expect(publishScript).not.toContain("const publishManifestPaths = [\n  'packages/core-types/package.json',\n  'packages/adapters/package.json',\n  'packages/manifest-schema/package.json',\n  'packages/registry/package.json'");
    expect(publishScript).not.toContain("'vendor/spwnr-registry/package.json'");
    expect(publishScript).toContain('Refusing to publish because some external workspace dependencies are not published yet.');
  });

  it('includes the expected plugin structure files', () => {
    const requiredPaths = [
      '.claude-plugin/plugin.json',
      '.claude-plugin/marketplace.json',
      '.claude-plugin/workers.json',
      'hooks/hooks.json',
      'hooks/session-start',
      'hooks/runtime-guard.mjs',
      'hooks/lib/runtime-guard.mjs',
      'skills/spwnr-do/SKILL.md',
      'skills/spwnr-principle/SKILL.md',
      'skills/spwnr-plan/SKILL.md',
      'skills/spwnr-task/SKILL.md',
      'skills/spwnr-task/task-pipeline.md',
      'skills/spwnr-task/task-team.md',
      'skills/spwnr-worker-audit/SKILL.md',
      'skills/using-spwnr/SKILL.md',
    ];

    for (const requiredPath of requiredPaths) {
      expect(existsSync(resolve(repoRoot, requiredPath)), requiredPath).toBe(true);
    }

    for (const removedPath of [
      'commands/do.md',
      'commands/plan.md',
      'commands/task.md',
      'commands/workers.md',
      'skills/workflow-do/SKILL.md',
      'skills/workflow-foundation/SKILL.md',
      'skills/workflow-planning/SKILL.md',
      'skills/workflow-task-orchestration/SKILL.md',
      'skills/workflow-task-with-team/SKILL.md',
      'skills/workflow-task-with-pipeline/SKILL.md',
      'skills/worker-audit/SKILL.md',
      'skills/using-spwnr-workflow/SKILL.md',
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
      readText('README.md'),
      readText('docs/guide/claude-plugin-workflow.md'),
      readText('docs/guide/getting-started.md'),
    ].join('\n');

    for (const expectedSnippet of [
      'spwnr',
      '/using-spwnr',
      '/spwnr-do',
      '/spwnr-plan',
      '/spwnr-task',
      '/spwnr-worker-audit',
      '.claude/do/',
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
      'task-pipeline.md',
      'task-team.md',
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
      'commands/',
      '/spwnr:do',
      '/spwnr:plan',
      '/spwnr:task',
      '/spwnr:workers',
      'workflow-task-with-pipeline',
      'workflow-task-with-team',
      'workflow-foundation',
      'workflow-planning',
      'workflow-do',
      '`worker-audit`',
    ]) {
      expect(combinedDocs).not.toContain(removedSnippet);
    }
  });

  it('encode plan-first execution guards, worker recovery, and helper-doc routing', () => {
    const gitignore = readText('.gitignore');
    const sessionStartHook = readText('hooks/session-start');
    const hooksJson = readText('hooks/hooks.json');
    const doSkill = readText('skills/spwnr-do/SKILL.md');
    const principleSkill = readText('skills/spwnr-principle/SKILL.md');
    const planningSkill = readText('skills/spwnr-plan/SKILL.md');
    const taskSkill = readText('skills/spwnr-task/SKILL.md');
    const taskTeamHelper = readText('skills/spwnr-task/task-team.md');
    const taskPipelineHelper = readText('skills/spwnr-task/task-pipeline.md');
    const workerAuditSkill = readText('skills/spwnr-worker-audit/SKILL.md');
    const workflowSkill = readText('skills/using-spwnr/SKILL.md');

    expect(gitignore).toContain('.claude/plans/');
    expect(gitignore).toContain('.claude/do/');

    expect(doSkill).toContain('/spwnr-do');
    expect(doSkill).toContain('Agent');
    expect(doSkill).toContain('inspect or update local files and notes as needed');
    expect(doSkill).toContain('spwnr resolve-workers');
    expect(doSkill).toContain('at most 3 direct workers');
    expect(doSkill).toContain('/spwnr-worker-audit');
    expect(doSkill).toContain('/spwnr-plan');
    expect(doSkill).toContain('.claude/do/spwnr-do-');
    expect(doSkill).toContain('Do Readiness');
    expect(doSkill).not.toContain('TaskCreate');
    expect(doSkill).not.toContain('TaskGet');
    expect(doSkill).not.toContain('TaskList');
    expect(doSkill).not.toContain('TaskUpdate');
    expect(doSkill).not.toContain('TeamCreate');
    expect(doSkill).not.toContain('SendMessage');
    expect(doSkill).not.toContain('TeamDelete');

    expect(principleSkill).toContain('Load the primary workflow skill with `Skill`');
    expect(principleSkill).toContain('Use `AskUserQuestion`');
    expect(principleSkill).toContain('Use `TodoWrite`');
    expect(principleSkill).toContain('Inspect repository or supplied context before asking the user anything.');
    expect(principleSkill).toContain('Persist the shared plan artifact to disk');
    expect(principleSkill).toContain('latest active plan revision');
    expect(principleSkill).toContain('planning-only `Agent` pass is allowed only after a draft plan is visible');
    expect(principleSkill).toContain('Do not call `TaskCreate`, `TaskGet`, `TaskList`, `TaskUpdate`, `TeamCreate`, `TeamDelete`, or `SendMessage`');
    expect(principleSkill).toContain('## Execution Task Contract');
    expect(principleSkill).toContain('## Execution Strategy Recommendation Contract');
    expect(principleSkill).toContain('pattern name');
    expect(principleSkill).toContain('multiple bounded pipelines in parallel');
    expect(principleSkill).toContain('do not default to multiple teammates editing the same file in parallel');
    expect(principleSkill).toContain('Owner: <agent-name|controller|unassigned>');
    expect(principleSkill).toContain('Files: <csv scope or none>');
    expect(principleSkill).toContain('Claim-Policy: <assigned|self-claim>');
    expect(principleSkill).toContain('Risk: <low|medium|high>');
    expect(principleSkill).toContain('Plan-Approval: <not-required|required|approved>');
    expect(principleSkill).toContain('Mode: <pipeline|team>');
    expect(principleSkill).toContain('`Blocked:` is reserved for current block state only');
    expect(principleSkill).toContain('`Depends-On:`');
    expect(principleSkill).toContain('### Compatibility Matrix');
    expect(principleSkill).toContain('### TaskCreate Preflight');

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

    expect(taskSkill).toContain('## Planning Gate');
    expect(taskSkill).toContain('## Approved Execution Spec');
    expect(taskSkill).toContain('## Routing Decision');
    expect(taskSkill).toContain('## Worker Readiness Required');
    expect(taskSkill).toContain('TaskCreate');
    expect(taskSkill).toContain('TaskGet');
    expect(taskSkill).toContain('TaskList');
    expect(taskSkill).toContain('TaskUpdate');
    expect(taskSkill).toContain('TeamCreate');
    expect(taskSkill).toContain('SendMessage');
    expect(taskSkill).toContain('TeamDelete');
    expect(taskSkill).toContain('pipeline');
    expect(taskSkill).toContain('team');
    expect(taskSkill).toContain('task-pipeline.md');
    expect(taskSkill).toContain('task-team.md');
    expect(taskSkill).toContain('latest active revision');
    expect(taskSkill).toContain('superseded');
    expect(taskSkill).toContain('install or inject the missing agents');
    expect(taskSkill).toContain('CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1');
    expect(taskSkill).toContain('current run');
    expect(taskSkill).toContain('Approved Execution Spec');
    expect(taskSkill).toContain('per-unit coverage');
    expect(taskSkill).not.toContain('workflow-task-with-pipeline');
    expect(taskSkill).not.toContain('workflow-task-with-team');

    expect(taskTeamHelper).toContain('## Team Topology');
    expect(taskTeamHelper).toContain('TaskCreate');
    expect(taskTeamHelper).toContain('TeamCreate');
    expect(taskTeamHelper).toContain('SendMessage');
    expect(taskTeamHelper).toContain('TeamDelete');
    expect(taskTeamHelper).toContain('multiple bounded pipelines in parallel');
    expect(taskTeamHelper).toContain('CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1');
    expect(taskTeamHelper).toContain('parallel teammates do not edit the same file');
    expect(taskTeamHelper).toContain('Do not encode sequencing or dependencies in `Blocked:`');
    expect(taskTeamHelper).toContain('## Team Mode Subagent Obligations');
    expect(taskTeamHelper).toContain('### Progress Sync Contract');
    expect(taskTeamHelper).toContain('### Local Storage Contract');
    expect(taskTeamHelper).toContain('High-risk tasks must not complete while `Plan-Approval:` is still `required`.');

    expect(taskPipelineHelper).toContain('## Pipeline Topology');
    expect(taskPipelineHelper).toContain('TaskCreate');
    expect(taskPipelineHelper).toContain('TaskGet');
    expect(taskPipelineHelper).toContain('TaskList');
    expect(taskPipelineHelper).toContain('TaskUpdate');
    expect(taskPipelineHelper).toContain('pipeline pattern');
    expect(taskPipelineHelper).toContain('stage-to-capability mapping');
    expect(taskPipelineHelper).toContain('handoff artifact');
    expect(taskPipelineHelper).toContain('pipeline');
    expect(taskPipelineHelper).toContain('Do not encode sequencing or dependencies in `Blocked:`');
    expect(taskPipelineHelper).not.toContain('TeamCreate');

    expect(workerAuditSkill).toContain('health-check and recovery surface');
    expect(workerAuditSkill).toContain('install or inject');
    expect(workerAuditSkill).toContain('return to the same active revision');
    expect(workerAuditSkill).toContain('Do not silently invent a fallback agent lineup');

    expect(workflowSkill).toContain('/using-spwnr');
    expect(workflowSkill).toContain('/spwnr-plan');
    expect(workflowSkill).toContain('/spwnr-task');
    expect(workflowSkill).toContain('implement');
    expect(workflowSkill).toContain('/spwnr-do');
    expect(workflowSkill).toContain('/spwnr-worker-audit');
    expect(workflowSkill).toContain('task-pipeline.md');
    expect(workflowSkill).toContain('task-team.md');
    expect(workflowSkill).toContain('spwnr-principle');
    expect(workflowSkill).toContain('spwnr-plan');
    expect(workflowSkill).toContain('CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1');

    expect(sessionStartHook).toContain('/using-spwnr');
    expect(sessionStartHook).toContain('/spwnr-do');
    expect(sessionStartHook).toContain('/spwnr-plan');
    expect(sessionStartHook).toContain('/spwnr-task');
    expect(sessionStartHook).toContain('/spwnr-worker-audit');
    expect(sessionStartHook).toContain('Skill');
    expect(sessionStartHook).toContain('AskUserQuestion');
    expect(sessionStartHook).toContain('TodoWrite');
    expect(sessionStartHook).toContain('inspect local context');
    expect(sessionStartHook).toContain('persist the detailed plan');
    expect(sessionStartHook).toContain('reviews the latest active revision');
    expect(sessionStartHook).toContain('.claude/do/spwnr-do-');
    expect(sessionStartHook).toContain('1-3');
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
    expect(sessionStartHook).toContain('spwnr-principle');
    expect(sessionStartHook).toContain('task-pipeline.md');
    expect(sessionStartHook).toContain('task-team.md');
    expect(sessionStartHook).toContain('pipeline');
    expect(sessionStartHook).toContain('multiple pipelines in parallel');
    expect(sessionStartHook).toContain('parallel units do not edit the same file');
    expect(sessionStartHook).toContain('worker-readiness recovery message');
    expect(sessionStartHook).toContain('Approved Execution Spec');
    expect(sessionStartHook).toContain('Plan, Unit, Mode, Worktree, Blocked, Owner, Files, Claim-Policy, Risk, and Plan-Approval');
    expect(sessionStartHook).toContain('`Blocked:` is reserved for current block state only');
    expect(sessionStartHook).toContain('`Depends-On:` or task graph relations');
    expect(sessionStartHook).toContain('--unit briefs');
    expect(sessionStartHook).toContain('latest active revision');
    expect(sessionStartHook).toContain('Execute current plan');

    expect(hooksJson).toContain('TaskCreated');
    expect(hooksJson).toContain('TaskCompleted');
    expect(hooksJson).toContain('TeammateIdle');
    expect(hooksJson).toContain('PermissionDenied');
    expect(hooksJson).toContain('Stop');
    expect(hooksJson).toContain('runtime-guard.mjs');

    const renamedSurface = [
      doSkill,
      principleSkill,
      planningSkill,
      taskSkill,
      taskTeamHelper,
      taskPipelineHelper,
      workerAuditSkill,
      workflowSkill,
      sessionStartHook,
    ].join('\n');

    for (const removedSnippet of [
      '/spwnr:do',
      '/spwnr:plan',
      '/spwnr:task',
      '/spwnr:workers',
      'workflow-task-with-pipeline',
      'workflow-task-with-team',
      'workflow-foundation',
      'workflow-planning',
      'workflow-do',
      '`worker-audit`',
    ]) {
      expect(renamedSurface).not.toContain(removedSnippet);
    }
  });

  it('encode request normalization and implementation-oriented execution standards in controller prompts', () => {
    const principleSkill = readText('skills/spwnr-principle/SKILL.md');
    const taskSkill = readText('skills/spwnr-task/SKILL.md');
    const taskTeamHelper = readText('skills/spwnr-task/task-team.md');
    const taskPipelineHelper = readText('skills/spwnr-task/task-pipeline.md');

    expect(principleSkill).toContain("Translate the user's raw wording into a structured task brief");
    expect(principleSkill).toContain('Do not require the user to rewrite the prompt');
    expect(principleSkill).toContain('decision-support materials');
    expect(principleSkill).toContain('2 to 4 concrete options');

    expect(taskSkill).toContain('normalized registry lookup brief');
    expect(taskSkill).toContain('per-unit coverage brief');
    expect(taskSkill).toContain('lineup that covers every execution unit');
    expect(taskSkill).toContain('task-pipeline.md');
    expect(taskSkill).toContain('task-team.md');
    expect(taskSkill).toContain('pipeline');
    expect(taskSkill).toContain('team');
    expect(taskSkill).not.toContain('swarm');

    expect(taskTeamHelper).toContain('selected lineup and why each package was chosen');
    expect(taskTeamHelper).toContain('multiple bounded pipelines in parallel');
    expect(taskPipelineHelper).toContain('stage-to-capability mapping');
    expect(taskPipelineHelper).toContain('handoff artifact');
  });

  it('keep workflow skills and task helpers within the 200-line host budget', () => {
    const countLines = (value: string): number => value.split('\n').length;

    const doSkill = readText('skills/spwnr-do/SKILL.md');
    const principleSkill = readText('skills/spwnr-principle/SKILL.md');
    const planningSkill = readText('skills/spwnr-plan/SKILL.md');
    const taskSkill = readText('skills/spwnr-task/SKILL.md');
    const taskTeamHelper = readText('skills/spwnr-task/task-team.md');
    const taskPipelineHelper = readText('skills/spwnr-task/task-pipeline.md');

    expect(countLines(doSkill)).toBeLessThanOrEqual(200);
    expect(countLines(principleSkill)).toBeLessThanOrEqual(200);
    expect(countLines(planningSkill)).toBeLessThanOrEqual(200);
    expect(countLines(taskSkill)).toBeLessThanOrEqual(200);
    expect(countLines(taskTeamHelper)).toBeLessThanOrEqual(200);
    expect(countLines(taskPipelineHelper)).toBeLessThanOrEqual(200);
  });

  it('makes spwnr-task invoke the split helper markdown files', () => {
    const taskSkill = readText('skills/spwnr-task/SKILL.md');

    expect(taskSkill).toContain('task-pipeline.md');
    expect(taskSkill).toContain('task-team.md');
    expect(existsSync(resolve(repoRoot, 'skills/workflow-task-with-pipeline/SKILL.md'))).toBe(false);
    expect(existsSync(resolve(repoRoot, 'skills/workflow-task-with-team/SKILL.md'))).toBe(false);
  });

  it('documents publish-script safeguards for the standalone registry package', () => {
    const publishScript = readText('scripts/publish-public-packages.mjs');

    expect(publishScript).toContain('Publishing the dependent packages now would create installable metadata that users cannot resolve from npm.');
  });
});
