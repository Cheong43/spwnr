import { HostType } from '@spwnr/core-types';
import type { HostAdapter, HostAdapterCompileInput, SessionComposition, SessionContext, StaticMaterialization, StaticMaterializationTarget } from './host-adapter.js';
import { compileHostAgent, materializeTextFiles } from './host-adapter.js';

function renderClaudePrompt(compiled: ReturnType<ClaudeAdapter['compile']>): string {
  if (compiled.skills.length === 0) {
    return compiled.agentMarkdown;
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
    'When skills are available, rely on the subagent name, description, prompt, and preloaded skills to choose appropriate tools automatically. Do not assume an explicit tool whitelist unless one is configured outside this file.',
  ].join('\n');
}

function renderClaudeFrontmatter(compiled: ReturnType<ClaudeAdapter['compile']>): string[] {
  const lines = [
    '---',
    `name: ${compiled.slug}`,
    `description: ${JSON.stringify(compiled.instruction)}`,
  ];

  if (compiled.skills.length > 0) {
    lines.push('skills:');
    for (const skill of compiled.skills) {
      lines.push(`  - ${skill.name}`);
    }
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
    const prompt = renderClaudePrompt(compiled);
    const markdown = [
      ...renderClaudeFrontmatter(compiled),
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
    const prompt = renderClaudePrompt(compiled);
    const descriptor = {
      [compiled.slug]: {
        description: compiled.instruction,
        prompt,
        ...(compiled.skills.length > 0
          ? {
              skills: compiled.skills.map((skill) => skill.name),
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
