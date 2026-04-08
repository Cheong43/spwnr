import { HostType } from '@spwnr/core-types';
import type { HostAdapter, HostAdapterCompileInput, SessionComposition, SessionContext, StaticMaterialization, StaticMaterializationTarget } from './host-adapter.js';
import { appendCompiledSkills, compileHostAgent, materializeTextFiles } from './host-adapter.js';

function renderTomlString(value: string): string {
  return JSON.stringify(value);
}

function renderTomlMultilineString(value: string): string {
  return `"""\n${value.replace(/\\/g, '\\\\').replace(/"""/g, '\\"""')}\n"""`;
}

function renderCodexAgentFile(compiled: ReturnType<CodexAdapter['compile']>): string {
  const prompt = appendCompiledSkills(compiled.agentMarkdown, compiled.skills);

  return [
    `name = ${renderTomlString(compiled.slug)}`,
    `description = ${renderTomlString(compiled.instruction)}`,
    `developer_instructions = ${renderTomlMultilineString(prompt)}`,
    '',
  ].join('\n');
}

export class CodexAdapter implements HostAdapter {
  readonly host = HostType.CODEX;

  supports(_mode: 'static' | 'session'): boolean {
    return true;
  }

  compile(input: HostAdapterCompileInput) {
    return compileHostAgent(this.host, input);
  }

  materializeStatic(compiled: ReturnType<CodexAdapter['compile']>, target: StaticMaterializationTarget): StaticMaterialization {
    const agentFile = renderCodexAgentFile(compiled);

    return materializeTextFiles(this.host, target.directory, [
      {
        relativePath: `${compiled.slug}.toml`,
        content: agentFile,
      },
    ]);
  }

  composeSession(compiled: ReturnType<CodexAdapter['compile']>, _context: SessionContext): SessionComposition {
    const prompt = appendCompiledSkills(compiled.agentMarkdown, compiled.skills);
    const path = `.codex/agents/${compiled.slug}.toml`;
    const toml = renderCodexAgentFile(compiled);
    const descriptor = {
      preview: true,
      host: this.host,
      custom_agent: {
        path,
        name: compiled.slug,
        description: compiled.instruction,
        developer_instructions: prompt,
        toml,
      },
    };

    return {
      host: this.host,
      descriptor,
      previewOnly: true,
      warnings: ['Codex session injection is preview-only in this release.'],
      shellCommand: `printf '%s\n' 'Codex session injection is preview-only.' '${JSON.stringify(descriptor)}'`,
    };
  }
}
