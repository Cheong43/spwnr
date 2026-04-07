import { z } from 'zod';
import type { SubagentManifest } from '@orchex/core-types';

export interface ValidationError {
  path: string;
  message: string;
}

export type ValidationResult =
  | { success: true; data: SubagentManifest }
  | { success: false; errors: ValidationError[] };

const BackendTypeSchema = z.enum(['opencode', 'claude_code', 'openclaw', 'codex', 'cline']);
const PolicyDecisionSchema = z.enum(['allow', 'ask', 'deny']);

const PolicyRuleSchema = z.object({
  pattern: z.string(),
  decision: PolicyDecisionSchema,
  reason: z.string().optional(),
});

const ToolPolicySchema = z.object({
  allow: z.array(z.string()).optional(),
  ask: z.array(z.string()).optional(),
  deny: z.array(z.string()).optional(),
});

const PermissionPolicySchema = z.object({
  filesystem: z.array(PolicyRuleSchema).optional(),
  shell: z.array(PolicyRuleSchema).optional(),
  network: z.array(PolicyRuleSchema).optional(),
  browser: z.array(PolicyRuleSchema).optional(),
  tools: z.array(PolicyRuleSchema).optional(),
});

const WorkflowStepSchema = z.object({
  id: z.string(),
  type: z.string(),
  tool: z.string().optional(),
  prompt: z.string().optional(),
  input: z.record(z.unknown()).optional(),
  output: z.string().optional(),
  next: z.union([
    z.string(),
    z.object({
      condition: z.string(),
      then: z.string(),
      else: z.string(),
    }),
  ]).optional(),
});

const SkillRefSchema = z.object({
  name: z.string(),
  path: z.string().optional(),
  version: z.string().optional(),
});

const ModelBindingSchema = z.object({
  mode: z.enum(['injectable', 'fixed', 'platform_managed']),
  defaultProvider: z.string().nullable().optional(),
  defaultModel: z.string().nullable().optional(),
  allowOverride: z.boolean().optional(),
  endpointRef: z.string().nullable().optional(),
  authRef: z.string().nullable().optional(),
  billing: z.object({
    mode: z.enum(['passthrough', 'bundled', 'metered']),
    sku: z.string().optional(),
  }).optional(),
});

const SemverRegex = /^\d+\.\d+\.\d+$/;

export const SubagentManifestSchema = z.object({
  apiVersion: z.string(),
  kind: z.literal('Subagent'),
  metadata: z.object({
    name: z.string().min(1),
    version: z.string().regex(SemverRegex, 'Version must be in semver format (x.y.z)'),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
  spec: z.object({
    persona: z.object({
      role: z.string().optional(),
      tone: z.string().optional(),
      style: z.string().optional(),
    }).optional(),
    input: z.object({ schema: z.string() }),
    output: z.object({ schema: z.string() }),
    workflow: z.object({
      entry: z.string(),
      steps: z.array(WorkflowStepSchema).optional(),
    }),
    skills: z.object({
      refs: z.array(SkillRefSchema),
    }).optional(),
    tools: ToolPolicySchema.optional(),
    permissions: PermissionPolicySchema.optional(),
    memory: z.object({
      scope: z.enum(['run', 'repo', 'project', 'workspace']),
      schema: z.string().optional(),
    }).optional(),
    compatibility: z.object({
      hosts: z.array(BackendTypeSchema).min(1),
      mode: z.enum(['single_host', 'cross_host']).optional(),
      minVersions: z.record(z.string()).optional(),
      badges: z.array(z.string()).optional(),
    }).optional(),
    artifacts: z.array(z.string()).optional(),
    modelBinding: ModelBindingSchema.optional(),
  }),
});

export function validateManifest(input: unknown): ValidationResult {
  const result = SubagentManifestSchema.safeParse(input);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors: ValidationError[] = result.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
  
  return { success: false, errors };
}
