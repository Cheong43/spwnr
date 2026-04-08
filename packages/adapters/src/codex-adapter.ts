import { HostType } from '@spwnr/core-types';
import type { HostAdapter, HostAdapterCompileInput, SessionComposition, SessionContext, StaticMaterialization, StaticMaterializationTarget } from './host-adapter.js';
import { appendCompiledSkills, compileHostAgent, materializeTextFiles } from './host-adapter.js';

export class CodexAdapter implements HostAdapter {
  readonly host = HostType.CODEX;

  supports(_mode: 'static' | 'session'): boolean {
    return true;
  }

  compile(input: HostAdapterCompileInput) {
    return compileHostAgent(this.host, input);
  }

  materializeStatic(compiled: ReturnType<CodexAdapter['compile']>, target: StaticMaterializationTarget): StaticMaterialization {
    const prompt = appendCompiledSkills(compiled.agentMarkdown, compiled.skills);
    const metadata = JSON.stringify({
      name: compiled.slug,
      description: compiled.instruction,
      details: compiled.description,
      source: compiled.manifest.metadata.name,
      host: this.host,
      skills: compiled.skills.map((skill) => skill.name),
    }, null, 2);

    return materializeTextFiles(this.host, target.directory, [
      {
        relativePath: `${compiled.slug}/SKILL.md`,
        content: `${prompt}\n`,
      },
      {
        relativePath: `${compiled.slug}/agent.json`,
        content: `${metadata}\n`,
      },
    ]);
  }

  composeSession(compiled: ReturnType<CodexAdapter['compile']>, _context: SessionContext): SessionComposition {
    const prompt = appendCompiledSkills(compiled.agentMarkdown, compiled.skills);
    const descriptor = {
      preview: true,
      host: this.host,
      skill: {
        name: compiled.slug,
        description: compiled.instruction,
        prompt,
        skills: compiled.skills.map((skill) => skill.name),
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
