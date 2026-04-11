import type { HostScope, HostType, PolicyDecision } from './enums.js';

export interface PolicyRule {
  pattern: string;
  decision: PolicyDecision;
  reason?: string;
}

export interface ToolPolicy {
  allow?: string[];
  ask?: string[];
  deny?: string[];
}

export interface PermissionPolicy {
  filesystem?: PolicyRule[];
  shell?: PolicyRule[];
  network?: PolicyRule[];
  browser?: PolicyRule[];
  tools?: PolicyRule[];
}

export interface SkillRef {
  name: string;
  path?: string;
  version?: string;
}

export interface LayeredSkills {
  universal?: SkillRef[];
  hosts?: Partial<Record<HostType, SkillRef[]>>;
}

export interface ManifestAuthor {
  name: string;
  github?: string;
  url?: string;
  email?: string;
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
  versionRange?: string;
  optional?: boolean;
  reason?: string;
  installHint?: string;
}

export interface ModelBinding {
  mode: 'injectable' | 'fixed' | 'platform_managed';
  defaultProvider?: string | null;
  defaultModel?: string | null;
  allowOverride?: boolean;
  endpointRef?: string | null;
  authRef?: string | null;
  billing?: {
    mode: 'passthrough' | 'bundled' | 'metered';
    sku?: string;
  };
}

export interface AgentDefinition {
  path: string;
}

export interface ManifestSchemas {
  input?: string;
  output?: string;
  memory?: string;
}

export interface InjectionModeConfig {
  enabled: boolean;
  defaultScope?: HostScope;
}

export interface HostInjectionConfig {
  static?: InjectionModeConfig;
  session?: InjectionModeConfig;
}

export interface InjectionHosts {
  claude_code?: HostInjectionConfig;
  codex?: HostInjectionConfig;
  copilot?: HostInjectionConfig;
  opencode?: HostInjectionConfig;
}

export interface SubagentManifest {
  apiVersion: 'subagent.io/v0.3';
  kind: 'Subagent';
  metadata: {
    name: string;
    version: string;
    instruction: string;
    description?: string;
    domains?: string[];
    tags?: string[];
    authors?: ManifestAuthor[];
    license?: string;
    homepage?: string;
    repository?: string;
  };
  spec: {
    persona?: {
      role?: string;
      tone?: string;
      style?: string;
    };
    agent: AgentDefinition;
    schemas?: ManifestSchemas;
    injection?: {
      hosts?: InjectionHosts;
    };
    skills?: LayeredSkills;
    tools?: ToolPolicy;
    permissions?: PermissionPolicy;
    memory?: {
      scope: 'run' | 'repo' | 'project' | 'workspace';
    };
    compatibility?: {
      hosts: HostType[];
      mode?: 'single_host' | 'cross_host';
      minVersions?: Record<string, string>;
      badges?: string[];
    };
    artifacts?: string[];
    modelBinding?: ModelBinding;
    dependencies?: {
      packages: PackageDependency[];
    };
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
