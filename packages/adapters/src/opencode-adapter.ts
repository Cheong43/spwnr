import { HostType } from '@spwnr/core-types';
import type { HostAdapter, HostAdapterCompileInput, SessionComposition, SessionContext, StaticMaterialization, StaticMaterializationTarget } from './host-adapter.js';
import { compileHostAgent, materializeTextFiles, renderAgentMarkdown } from './host-adapter.js';

export class OpenCodeAdapter implements HostAdapter {
  readonly host = HostType.OPENCODE;

  supports(_mode: 'static' | 'session'): boolean {
    return true;
  }

  compile(input: HostAdapterCompileInput) {
    return compileHostAgent(this.host, input);
  }

  materializeStatic(compiled: ReturnType<OpenCodeAdapter['compile']>, target: StaticMaterializationTarget): StaticMaterialization {
    return materializeTextFiles(this.host, target.directory, [
      {
        relativePath: `${compiled.slug}.md`,
        content: renderAgentMarkdown(compiled),
      },
    ]);
  }

  composeSession(compiled: ReturnType<OpenCodeAdapter['compile']>, _context: SessionContext): SessionComposition {
    const descriptor = {
      overlay: {
        agents: [
          {
            key: compiled.slug,
            prompt: compiled.systemPrompt,
          },
        ],
      },
    };

    return {
      host: this.host,
      descriptor,
      shellCommand: `opencode --descriptor '${JSON.stringify(descriptor)}'`,
    };
  }
}
