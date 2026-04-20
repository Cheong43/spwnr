import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { HostType } from '@spwnr/core-types';
import type { PermissionPolicy, ToolPolicy } from '@spwnr/core-types';
import type { HostAdapter, HostAdapterCompileInput, SessionComposition, SessionContext, StaticMaterialization, StaticMaterializationTarget } from './host-adapter.js';
import { compileHostAgent, materializeTextFiles } from './host-adapter.js';

interface ClaudeLaunchPolicy {
  permissionModel: 'explicit_allow_all';
  writeIsolation: {
    mode: 'worktree_required_for_mutation';
    autoEnter: boolean;
    autoExit: boolean;
    summaryTool: 'BriefTool';
    discoveryTool: 'ToolSearchTool';
  };
}

interface EffectiveClaudeRuntimeConfig {
  permissionModel: ClaudeLaunchPolicy['permissionModel'] | 'manifest_declared';
  permissionPolicy: PermissionPolicy | null;
  toolPolicy: ToolPolicy | null;
  writeIsolation: ClaudeLaunchPolicy['writeIsolation'];
  runtimeDependencies: {
    discoveryTool: 'ToolSearchTool';
    enterTool: 'EnterWorktreeTool';
    summaryTool: 'BriefTool';
    exitTool: 'ExitWorktreeTool';
  };
}

const DEFAULT_CLAUDE_LAUNCH_POLICY: ClaudeLaunchPolicy = {
  permissionModel: 'explicit_allow_all',
  writeIsolation: {
    mode: 'worktree_required_for_mutation',
    autoEnter: true,
    autoExit: true,
    summaryTool: 'BriefTool',
    discoveryTool: 'ToolSearchTool',
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function loadClaudeLaunchPolicy(cwd: string = process.cwd()): ClaudeLaunchPolicy {
  const policyPath = resolve(cwd, '.claude-plugin', 'workers.json');
  if (!existsSync(policyPath)) {
    return DEFAULT_CLAUDE_LAUNCH_POLICY;
  }

  const raw = JSON.parse(readFileSync(policyPath, 'utf-8'));
  const launchPolicy = isRecord(raw.launchPolicy) ? raw.launchPolicy : {};
  const claudeCodePolicy = isRecord(launchPolicy.claude_code) ? launchPolicy.claude_code : {};
  const writeIsolation = isRecord(claudeCodePolicy.writeIsolation) ? claudeCodePolicy.writeIsolation : {};

  return {
    permissionModel: 'explicit_allow_all',
    writeIsolation: {
      mode: 'worktree_required_for_mutation',
      autoEnter:
        typeof writeIsolation.autoEnter === 'boolean'
          ? writeIsolation.autoEnter
          : DEFAULT_CLAUDE_LAUNCH_POLICY.writeIsolation.autoEnter,
      autoExit:
        typeof writeIsolation.autoExit === 'boolean'
          ? writeIsolation.autoExit
          : DEFAULT_CLAUDE_LAUNCH_POLICY.writeIsolation.autoExit,
      summaryTool:
        writeIsolation.summaryTool === 'BriefTool'
          ? 'BriefTool'
          : DEFAULT_CLAUDE_LAUNCH_POLICY.writeIsolation.summaryTool,
      discoveryTool:
        writeIsolation.discoveryTool === 'ToolSearchTool'
          ? 'ToolSearchTool'
          : DEFAULT_CLAUDE_LAUNCH_POLICY.writeIsolation.discoveryTool,
    },
  };
}

function resolveClaudeRuntimeConfig(compiled: ReturnType<ClaudeAdapter['compile']>): EffectiveClaudeRuntimeConfig {
  const launchPolicy = loadClaudeLaunchPolicy();
  const permissionPolicy = compiled.manifest.spec.permissions ?? null;
  const toolPolicy = compiled.manifest.spec.tools ?? null;

  return {
    permissionModel: permissionPolicy ? 'manifest_declared' : launchPolicy.permissionModel,
    permissionPolicy,
    toolPolicy,
    writeIsolation: launchPolicy.writeIsolation,
    runtimeDependencies: {
      discoveryTool: launchPolicy.writeIsolation.discoveryTool,
      enterTool: 'EnterWorktreeTool',
      summaryTool: launchPolicy.writeIsolation.summaryTool,
      exitTool: 'ExitWorktreeTool',
    },
  };
}

function renderClaudePrompt(
  compiled: ReturnType<ClaudeAdapter['compile']>,
  runtimeConfig: EffectiveClaudeRuntimeConfig,
): string {
  if (compiled.skills.length === 0) {
    return [
      compiled.agentMarkdown,
      '',
      '## Runtime Dependencies',
      '',
      'For mutating work in Claude Code, discover the required system tools with `ToolSearchTool`, enter an isolated git worktree with `EnterWorktreeTool`, produce a closing summary with `BriefTool`, and then clean up with `ExitWorktreeTool`.',
      `Repo default permission model: ${runtimeConfig.permissionModel}.`,
      runtimeConfig.permissionPolicy
        ? 'This subagent provides a manifest-level permission policy that overrides the repo default.'
        : 'No manifest-level permission override is declared, so the repo-global Claude default applies.',
      runtimeConfig.toolPolicy
        ? 'This subagent provides a manifest-level tool policy that overrides the repo default runtime tool assumptions.'
        : 'No manifest-level tool override is declared, so the repo-global Claude runtime tool assumptions apply.',
    ].join('\n');
  }

  const skillNames = compiled.skills.map((skill) => skill.name);
  const installCommand = `spwnr inject ${JSON.stringify(compiled.manifest.metadata.name)} --host claude_code --scope project`;

  return [
    compiled.agentMarkdown,
    '',
    '## Preloaded Skills',
    '',
    `Claude Code should preload these skills for this subagent: ${skillNames.join(', ')}.`,
    'If they are not available in the current Claude environment, install this package with Spwnr CLI first.',
    '',
    '```bash',
    installCommand,
    '# Or use --scope user to install under ~/.claude',
    '```',
    '',
    '## Runtime Dependencies',
    '',
    'For mutating work in Claude Code, discover the required system tools with `ToolSearchTool`, enter an isolated git worktree with `EnterWorktreeTool`, produce a closing summary with `BriefTool`, and then clean up with `ExitWorktreeTool`.',
    `Repo default permission model: ${runtimeConfig.permissionModel}.`,
    runtimeConfig.permissionPolicy
      ? 'This subagent provides a manifest-level permission policy that overrides the repo default.'
      : 'No manifest-level permission override is declared, so the repo-global Claude default applies.',
    runtimeConfig.toolPolicy
      ? 'This subagent provides a manifest-level tool policy that overrides the repo default runtime tool assumptions.'
      : 'No manifest-level tool override is declared, so the repo-global Claude runtime tool assumptions apply.',
  ].join('\n');
}

function renderClaudeFrontmatter(
  compiled: ReturnType<ClaudeAdapter['compile']>,
  runtimeConfig: EffectiveClaudeRuntimeConfig,
): string[] {
  const lines = [
    '---',
    `name: ${compiled.slug}`,
    `description: ${JSON.stringify(compiled.instruction)}`,
    `permissionModel: ${runtimeConfig.permissionModel}`,
    `writeIsolation: ${JSON.stringify(runtimeConfig.writeIsolation)}`,
    `runtimeDependencies: ${JSON.stringify(runtimeConfig.runtimeDependencies)}`,
  ];

  if (compiled.skills.length > 0) {
    lines.push('skills:');
    for (const skill of compiled.skills) {
      lines.push(`  - ${skill.name}`);
    }
  }

  if (runtimeConfig.permissionPolicy) {
    lines.push(`permissions: ${JSON.stringify(runtimeConfig.permissionPolicy)}`);
  }

  if (runtimeConfig.toolPolicy) {
    lines.push(`tools: ${JSON.stringify(runtimeConfig.toolPolicy)}`);
  }

  lines.push('---');
  return lines;
}

export class ClaudeAdapter implements HostAdapter {
  readonly host = HostType.CLAUDE_CODE;

  supports(_mode: 'static' | 'session'): boolean {
    return true;
  }

  compile(input: HostAdapterCompileInput) {
    return compileHostAgent(this.host, input);
  }

  materializeStatic(compiled: ReturnType<ClaudeAdapter['compile']>, target: StaticMaterializationTarget): StaticMaterialization {
    const runtimeConfig = resolveClaudeRuntimeConfig(compiled);
    const prompt = renderClaudePrompt(compiled, runtimeConfig);
    const markdown = [
      ...renderClaudeFrontmatter(compiled, runtimeConfig),
      '',
      prompt,
      '',
    ].join('\n');

    return materializeTextFiles(this.host, target.directory, [
      {
        relativePath: `${compiled.slug}.md`,
        content: markdown,
      },
      ...compiled.skills
        .filter((skill) => skill.content)
        .map((skill) => ({
          relativePath: `../skills/${skill.slug}/SKILL.md`,
          content: `${skill.content}\n`,
        })),
    ]);
  }

  composeSession(compiled: ReturnType<ClaudeAdapter['compile']>, _context: SessionContext): SessionComposition {
    const runtimeConfig = resolveClaudeRuntimeConfig(compiled);
    const prompt = renderClaudePrompt(compiled, runtimeConfig);
    const descriptor = {
      [compiled.slug]: {
        description: compiled.instruction,
        prompt,
        ...(compiled.skills.length > 0
          ? {
              skills: compiled.skills.map((skill) => skill.name),
            }
          : {}),
        permissionModel: runtimeConfig.permissionModel,
        writeIsolation: runtimeConfig.writeIsolation,
        runtimeDependencies: runtimeConfig.runtimeDependencies,
        ...(runtimeConfig.permissionPolicy
          ? {
              permissions: runtimeConfig.permissionPolicy,
            }
          : {}),
        ...(runtimeConfig.toolPolicy
          ? {
              tools: runtimeConfig.toolPolicy,
            }
          : {}),
      },
    };

    return {
      host: this.host,
      descriptor,
      shellCommand: `claude --agents '${JSON.stringify(descriptor)}'`,
    };
  }
}
