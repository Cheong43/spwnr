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

export interface WorkflowStep {
  id: string;
  type: string;
  tool?: string;
  prompt?: string;
  input?: Record<string, unknown>;
  output?: string;
  next?: string | { condition: string; then: string; else: string };
}

export interface SkillRef {
  name: string;
  path?: string;
  version?: string;
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

export interface PromptInstructions {
  system: string;
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
  apiVersion: string;
  kind: 'Subagent';
  metadata: {
    name: string;
    version: string;
    description?: string;
    tags?: string[];
  };
  spec: {
    persona?: {
      role?: string;
      tone?: string;
      style?: string;
    };
    instructions: PromptInstructions;
    input: { schema: string };
    output: { schema: string };
    workflow?: {
      entry: string;
      steps?: WorkflowStep[];
    };
    injection?: {
      hosts?: InjectionHosts;
    };
    skills?: {
      refs: SkillRef[];
    };
    tools?: ToolPolicy;
    permissions?: PermissionPolicy;
    memory?: {
      scope: 'run' | 'repo' | 'project' | 'workspace';
      schema?: string;
    };
    compatibility?: {
      hosts: HostType[];
      mode?: 'single_host' | 'cross_host';
      minVersions?: Record<string, string>;
      badges?: string[];
    };
    artifacts?: string[];
    modelBinding?: ModelBinding;
  };
}
