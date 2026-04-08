import { HostType } from '@spwnr/core-types';
import type { HostAdapter, HostAdapterCompileInput, SessionComposition, SessionContext, StaticMaterialization, StaticMaterializationTarget } from './host-adapter.js';
import { compileHostAgent, materializeTextFiles } from './host-adapter.js';

export class ClaudeAdapter implements HostAdapter {
  readonly host = HostType.CLAUDE_CODE;

  supports(_mode: 'static' | 'session'): boolean {
    return true;
  }

  compile(input: HostAdapterCompileInput) {
    return compileHostAgent(this.host, input);
  }

  materializeStatic(compiled: ReturnType<ClaudeAdapter['compile']>, target: StaticMaterializationTarget): StaticMaterialization {
    return materializeTextFiles(this.host, target.directory, [
      {
        relativePath: `${compiled.slug}.md`,
        content: `${compiled.agentMarkdown}\n`,
      },
    ]);
  }

  composeSession(compiled: ReturnType<ClaudeAdapter['compile']>, _context: SessionContext): SessionComposition {
    const descriptor = {
      agents: [
        {
          name: compiled.slug,
          description: compiled.instruction,
          prompt: compiled.agentMarkdown,
        },
      ],
    };

    return {
      host: this.host,
      descriptor,
      shellCommand: `claude --agents '${JSON.stringify(descriptor)}'`,
    };
  }
}
