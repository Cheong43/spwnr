import { HostType } from '@spwnr/core-types';
import type { HostAdapter, HostAdapterCompileInput, SessionComposition, SessionContext, StaticMaterialization, StaticMaterializationTarget } from './host-adapter.js';
import { compileHostAgent, materializeTextFiles } from './host-adapter.js';

export class CopilotAdapter implements HostAdapter {
  readonly host = HostType.COPILOT;

  supports(_mode: 'static' | 'session'): boolean {
    return true;
  }

  compile(input: HostAdapterCompileInput) {
    return compileHostAgent(this.host, input);
  }

  materializeStatic(compiled: ReturnType<CopilotAdapter['compile']>, target: StaticMaterializationTarget): StaticMaterialization {
    const markdown = [
      '---',
      `name: ${compiled.slug}`,
      `description: ${JSON.stringify(compiled.instruction)}`,
      '---',
      '',
      compiled.agentMarkdown,
      '',
    ].join('\n');

    return materializeTextFiles(this.host, target.directory, [
      {
        relativePath: `${compiled.slug}.agent.md`,
        content: markdown,
      },
    ]);
  }

  composeSession(compiled: ReturnType<CopilotAdapter['compile']>, _context: SessionContext): SessionComposition {
    const descriptor = {
      profile: {
        name: compiled.slug,
        description: compiled.instruction,
        instructions: compiled.agentMarkdown,
      },
    };

    return {
      host: this.host,
      descriptor,
      shellCommand: `copilot --agent=${compiled.slug}`,
    };
  }
}
