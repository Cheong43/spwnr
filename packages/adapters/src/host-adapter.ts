import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { resolveSkillsForHost, type HostScope, type HostType, type SkillRef, type SubagentManifest } from '@spwnr/core-types';

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
  description: string | null;
  instruction: string;
  agentMarkdown: string;
  skills: CompiledSkill[];
}

export interface CompiledSkill {
  name: string;
  slug: string;
  path: string | null;
  content: string | null;
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

export function readAgentMarkdown(packageDir: string, manifest: SubagentManifest): string {
  return readFileSync(join(packageDir, manifest.spec.agent.path), 'utf-8').trim();
}

export function normalizeInstructionSummary(instruction: string): string {
  return instruction.replace(/\s+/g, ' ').trim();
}

export function resolveSkillFile(packageDir: string, skill: SkillRef): string | null {
  if (!skill.path) {
    return null;
  }

  const directorySkillPath = join(packageDir, skill.path, 'SKILL.md');
  if (existsSync(directorySkillPath)) {
    return directorySkillPath;
  }

  const directSkillPath = join(packageDir, skill.path);
  if (existsSync(directSkillPath)) {
    return directSkillPath;
  }

  return null;
}

export function compileSkills(packageDir: string, manifest: SubagentManifest, host: HostType): CompiledSkill[] {
  return resolveSkillsForHost(manifest, host).map((skill) => {
    const resolvedPath = resolveSkillFile(packageDir, skill);

    return {
      name: skill.name,
      slug: slugifyAgentName(skill.name),
      path: resolvedPath,
      content: resolvedPath ? readFileSync(resolvedPath, 'utf-8').trim() : null,
    };
  });
}

export function renderCompiledSkillsAppendix(skills: CompiledSkill[], heading = '## Resolved Skills'): string {
  const renderedSkills = skills
    .filter((skill) => skill.content)
    .map((skill) => `### ${skill.name}\n\n${skill.content}`)
    .join('\n\n');

  if (!renderedSkills) {
    return '';
  }

  return `${heading}\n\n${renderedSkills}`;
}

export function appendCompiledSkills(agentMarkdown: string, skills: CompiledSkill[], heading?: string): string {
  const appendix = renderCompiledSkillsAppendix(skills, heading);
  if (!appendix) {
    return agentMarkdown;
  }

  return `${agentMarkdown}\n\n${appendix}`;
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

export function compileHostAgent(host: HostType, input: HostAdapterCompileInput): CompiledHostAgent {
  return {
    host,
    manifest: input.manifest,
    packageDir: input.packageDir,
    slug: slugifyAgentName(input.manifest.metadata.name),
    title: input.manifest.metadata.name,
    description: input.manifest.metadata.description ?? null,
    instruction: normalizeInstructionSummary(input.manifest.metadata.instruction),
    agentMarkdown: readAgentMarkdown(input.packageDir, input.manifest),
    skills: compileSkills(input.packageDir, input.manifest, host),
  };
}
