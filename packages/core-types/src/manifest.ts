import type { HostScope, HostType, PolicyDecision } from './enums.js';

export interface PolicyRule {
  pattern: string;
  decision: PolicyDecision;
  reason?: string | undefined;
}

export interface ToolPolicy {
  allow?: string[] | undefined;
  ask?: string[] | undefined;
  deny?: string[] | undefined;
}

export interface PermissionPolicy {
  filesystem?: PolicyRule[] | undefined;
  shell?: PolicyRule[] | undefined;
  network?: PolicyRule[] | undefined;
  browser?: PolicyRule[] | undefined;
  tools?: PolicyRule[] | undefined;
}

export interface SkillRef {
  name: string;
  path?: string | undefined;
  version?: string | undefined;
}

export interface LayeredSkills {
  universal?: SkillRef[] | undefined;
  hosts?: Partial<Record<HostType, SkillRef[] | undefined>> | undefined;
}

export interface ManifestAuthor {
  name: string;
  github?: string | undefined;
  url?: string | undefined;
  email?: string | undefined;
}

export type DependencyEcosystem =
  | 'npm'
  | 'pnpm'
  | 'pip'
  | 'brew'
  | 'apt'
  | 'cargo'
  | 'go'
  | 'binary';

export interface PackageDependency {
  ecosystem: DependencyEcosystem;
  name: string;
  versionRange?: string | undefined;
  optional?: boolean | undefined;
  reason?: string | undefined;
  installHint?: string | undefined;
}

export interface ModelBinding {
  mode: 'injectable' | 'fixed' | 'platform_managed';
  defaultProvider?: string | null | undefined;
  defaultModel?: string | null | undefined;
  allowOverride?: boolean | undefined;
  endpointRef?: string | null | undefined;
  authRef?: string | null | undefined;
  billing?: {
    mode: 'passthrough' | 'bundled' | 'metered';
    sku?: string | undefined;
  } | undefined;
}

export interface AgentDefinition {
  path: string;
}

export interface ManifestSchemas {
  input?: string | undefined;
  output?: string | undefined;
  memory?: string | undefined;
}

export interface InjectionModeConfig {
  enabled: boolean;
  defaultScope?: HostScope | undefined;
}

export interface HostInjectionConfig {
  static?: InjectionModeConfig | undefined;
  session?: InjectionModeConfig | undefined;
}

export interface InjectionHosts {
  claude_code?: HostInjectionConfig | undefined;
  codex?: HostInjectionConfig | undefined;
  copilot?: HostInjectionConfig | undefined;
  opencode?: HostInjectionConfig | undefined;
}

export interface SubagentManifest {
  apiVersion: 'spwnr/v1';
  kind: 'Subagent';
  metadata: {
    name: string;
    version: string;
    instruction: string;
    description?: string | undefined;
    domains?: string[] | undefined;
    tags?: string[] | undefined;
    authors?: ManifestAuthor[] | undefined;
    license?: string | undefined;
    homepage?: string | undefined;
    repository?: string | undefined;
  };
  spec: {
    persona?: {
      role?: string | undefined;
      tone?: string | undefined;
      style?: string | undefined;
    } | undefined;
    agent: AgentDefinition;
    schemas?: ManifestSchemas | undefined;
    injection?: {
      hosts?: InjectionHosts | undefined;
    } | undefined;
    skills?: LayeredSkills | undefined;
    tools?: ToolPolicy | undefined;
    permissions?: PermissionPolicy | undefined;
    memory?: {
      scope: 'run' | 'repo' | 'project' | 'workspace';
    } | undefined;
    compatibility?: {
      hosts: HostType[];
      mode?: 'single_host' | 'cross_host' | undefined;
      minVersions?: Record<string, string> | undefined;
      badges?: string[] | undefined;
    } | undefined;
    artifacts?: string[] | undefined;
    modelBinding?: ModelBinding | undefined;
    dependencies?: {
      packages: PackageDependency[];
    } | undefined;
  };
}

export function resolveSkillsForHost(manifest: SubagentManifest, host: HostType): SkillRef[] {
  const resolved = [...(manifest.spec.skills?.universal ?? [])];
  const byName = new Map(resolved.map((skill, index) => [skill.name, index]));

  for (const skill of manifest.spec.skills?.hosts?.[host] ?? []) {
    const existingIndex = byName.get(skill.name);
    if (existingIndex === undefined) {
      byName.set(skill.name, resolved.length);
      resolved.push(skill);
      continue;
    }

    resolved[existingIndex] = skill;
  }

  return resolved;
}
