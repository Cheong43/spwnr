import { HostType } from '@spwnr/core-types';
import type { HostAdapter, HostAdapterCompileInput, SessionComposition, SessionContext, StaticMaterialization, StaticMaterializationTarget } from './host-adapter.js';
import { appendCompiledSkills, compileHostAgent, materializeTextFiles } from './host-adapter.js';

export class CopilotAdapter implements HostAdapter {
  readonly host = HostType.COPILOT;

  supports(_mode: 'static' | 'session'): boolean {
    return true;
  }

  compile(input: HostAdapterCompileInput) {
    return compileHostAgent(this.host, input);
  }

  materializeStatic(compiled: ReturnType<CopilotAdapter['compile']>, target: StaticMaterializationTarget): StaticMaterialization {
    const prompt = appendCompiledSkills(compiled.agentMarkdown, compiled.skills);
    const markdown = [
      '---',
      `name: ${compiled.slug}`,
      `description: ${JSON.stringify(compiled.instruction)}`,
      '---',
      '',
      prompt,
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
    const prompt = appendCompiledSkills(compiled.agentMarkdown, compiled.skills);
    const descriptor = {
      profile: {
        name: compiled.slug,
        description: compiled.instruction,
        instructions: prompt,
      },
    };

    return {
      host: this.host,
      descriptor,
      shellCommand: `copilot --agent=${compiled.slug}`,
    };
  }
}
