import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { HostScope, HostType, SkillRef, SubagentManifest } from '@spwnr/core-types';

export type InjectionMode = 'static' | 'session';

export interface HostAdapterCompileInput {
  manifest: SubagentManifest;
  packageDir: string;
}

export interface CompiledHostAgent {
  host: HostType;
  manifest: SubagentManifest;
  packageDir: string;
  slug: string;
  title: string;
  systemPrompt: string;
}

export interface StaticMaterializationTarget {
  directory: string;
  scope: HostScope;
}

export interface MaterializedFile {
  path: string;
  content: string;
}

export interface StaticMaterialization {
  host: HostType;
  targetDir: string;
  files: MaterializedFile[];
}

export interface SessionContext {
  scope: HostScope;
}

export interface SessionComposition {
  host: HostType;
  descriptor: Record<string, unknown>;
  shellCommand: string;
  previewOnly?: boolean;
  warnings?: string[];
}

export interface HostAdapter {
  readonly host: HostType;
  supports(mode: InjectionMode): boolean;
  compile(input: HostAdapterCompileInput): CompiledHostAgent;
  materializeStatic(compiled: CompiledHostAgent, target: StaticMaterializationTarget): StaticMaterialization;
  composeSession(compiled: CompiledHostAgent, context: SessionContext): SessionComposition;
}

export function slugifyAgentName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function readSystemPrompt(packageDir: string, manifest: SubagentManifest): string {
  return readFileSync(join(packageDir, manifest.spec.instructions.system), 'utf-8').trim();
}

export function materializeTextFiles(
  host: HostType,
  targetDir: string,
  files: Array<{ relativePath: string; content: string }>,
): StaticMaterialization {
  const materialized: MaterializedFile[] = [];

  for (const file of files) {
    const absolutePath = join(targetDir, file.relativePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, file.content);
    materialized.push({ path: absolutePath, content: file.content });
  }

  return {
    host,
    targetDir,
    files: materialized,
  };
}

export function renderSkillList(skills: SkillRef[] = []): string {
  if (skills.length === 0) {
    return 'No packaged skills declared.';
  }

  return skills
    .map((skill) => {
      const pathText = skill.path ? ` (${skill.path})` : '';
      const versionText = skill.version ? ` @${skill.version}` : '';
      return `- ${skill.name}${versionText}${pathText}`;
    })
    .join('\n');
}

export function renderModelBinding(manifest: SubagentManifest): string {
  if (!manifest.spec.modelBinding) {
    return 'No model binding declared.';
  }

  const binding = manifest.spec.modelBinding;
  const provider = binding.defaultProvider ?? 'host-default';
  const model = binding.defaultModel ?? 'host-default';
  return `mode=${binding.mode}, provider=${provider}, model=${model}`;
}

export function renderAgentMarkdown(compiled: CompiledHostAgent, heading = compiled.title): string {
  const description = compiled.manifest.metadata.description ?? 'No description provided.';
  const skills = renderSkillList(compiled.manifest.spec.skills?.refs ?? []);
  const modelBinding = renderModelBinding(compiled.manifest);

  return [
    `# ${heading}`,
    '',
    description,
    '',
    '## System Prompt',
    '',
    compiled.systemPrompt,
    '',
    '## Skills',
    '',
    skills,
    '',
    '## Model Binding',
    '',
    modelBinding,
    '',
  ].join('\n');
}

export function compileHostAgent(host: HostType, input: HostAdapterCompileInput): CompiledHostAgent {
  return {
    host,
    manifest: input.manifest,
    packageDir: input.packageDir,
    slug: slugifyAgentName(input.manifest.metadata.name),
    title: input.manifest.metadata.name,
    systemPrompt: readSystemPrompt(input.packageDir, input.manifest),
  };
}
