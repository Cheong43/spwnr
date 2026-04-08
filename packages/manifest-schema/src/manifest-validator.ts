import { z } from 'zod';
import type { SubagentManifest } from '@spwnr/core-types';

export interface ValidationError {
  path: string;
  message: string;
}

export type ValidationResult =
  | { success: true; data: SubagentManifest }
  | { success: false; errors: ValidationError[] };

const HostTypeSchema = z.enum(['claude_code', 'codex', 'copilot', 'opencode']);
const PolicyDecisionSchema = z.enum(['allow', 'ask', 'deny']);
const HostScopeSchema = z.enum(['project', 'user']);

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

const AuthorSchema = z.object({
  name: z.string().min(1),
  github: z.string().min(1).optional(),
  url: z.string().url().optional(),
  email: z.string().email().optional(),
});

const PackageDependencySchema = z.object({
  ecosystem: z.enum(['npm', 'pnpm', 'pip', 'brew', 'apt', 'cargo', 'go', 'binary']),
  name: z.string().min(1),
  versionRange: z.string().optional(),
  optional: z.boolean().optional(),
  reason: z.string().optional(),
  installHint: z.string().optional(),
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

const InjectionModeConfigSchema = z.object({
  enabled: z.boolean(),
  defaultScope: HostScopeSchema.optional(),
});

const HostInjectionConfigSchema = z.object({
  static: InjectionModeConfigSchema.optional(),
  session: InjectionModeConfigSchema.optional(),
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
    authors: z.array(AuthorSchema).optional(),
    license: z.string().optional(),
    homepage: z.string().url().optional(),
    repository: z.string().url().optional(),
  }),
  spec: z.object({
    persona: z.object({
      role: z.string().optional(),
      tone: z.string().optional(),
      style: z.string().optional(),
    }).optional(),
    instructions: z.object({
      system: z.string(),
    }),
    input: z.object({ schema: z.string() }),
    output: z.object({ schema: z.string() }),
    workflow: z.object({
      entry: z.string(),
      steps: z.array(WorkflowStepSchema).optional(),
    }).optional(),
    injection: z.object({
      hosts: z.object({
        claude_code: HostInjectionConfigSchema.optional(),
        codex: HostInjectionConfigSchema.optional(),
        copilot: HostInjectionConfigSchema.optional(),
        opencode: HostInjectionConfigSchema.optional(),
      }).optional(),
    }).optional(),
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
      hosts: z.array(HostTypeSchema).min(1),
      mode: z.enum(['single_host', 'cross_host']).optional(),
      minVersions: z.record(z.string()).optional(),
      badges: z.array(z.string()).optional(),
    }).optional(),
    artifacts: z.array(z.string()).optional(),
    modelBinding: ModelBindingSchema.optional(),
    dependencies: z.object({
      packages: z.array(PackageDependencySchema),
    }).optional(),
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
