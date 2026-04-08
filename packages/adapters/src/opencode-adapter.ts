import { HostType } from '@spwnr/core-types';
import type { HostAdapter, HostAdapterCompileInput, SessionComposition, SessionContext, StaticMaterialization, StaticMaterializationTarget } from './host-adapter.js';
import { appendCompiledSkills, compileHostAgent, materializeTextFiles } from './host-adapter.js';

export class OpenCodeAdapter implements HostAdapter {
  readonly host = HostType.OPENCODE;

  supports(_mode: 'static' | 'session'): boolean {
    return true;
  }

  compile(input: HostAdapterCompileInput) {
    return compileHostAgent(this.host, input);
  }

  materializeStatic(compiled: ReturnType<OpenCodeAdapter['compile']>, target: StaticMaterializationTarget): StaticMaterialization {
    const prompt = appendCompiledSkills(compiled.agentMarkdown, compiled.skills);
    return materializeTextFiles(this.host, target.directory, [
      {
        relativePath: `${compiled.slug}.md`,
        content: `${prompt}\n`,
      },
    ]);
  }

  composeSession(compiled: ReturnType<OpenCodeAdapter['compile']>, _context: SessionContext): SessionComposition {
    const prompt = appendCompiledSkills(compiled.agentMarkdown, compiled.skills);
    const descriptor = {
      overlay: {
        agents: [
          {
            key: compiled.slug,
            description: compiled.instruction,
            prompt,
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
