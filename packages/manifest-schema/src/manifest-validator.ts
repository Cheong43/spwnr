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

const SkillRefSchema = z.object({
  name: z.string(),
  path: z.string().optional(),
  version: z.string().optional(),
});

const SkillRefsSchema = z.array(SkillRefSchema);

const LayeredSkillsSchema = z.object({
  universal: SkillRefsSchema.optional(),
  hosts: z.object({
    claude_code: SkillRefsSchema.optional(),
    codex: SkillRefsSchema.optional(),
    copilot: SkillRefsSchema.optional(),
    opencode: SkillRefsSchema.optional(),
  }).strict().optional(),
}).strict();

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
const ApiVersionSchema = z.literal('spwnr/v1');

function findDuplicateSkillNames(skills: Array<{ name: string }>): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const skill of skills) {
    if (seen.has(skill.name)) {
      duplicates.add(skill.name);
      continue;
    }

    seen.add(skill.name);
  }

  return [...duplicates];
}

function countUnicodeCharacters(value: string): number {
  return [...value].length;
}

const InstructionSummarySchema = z
  .string()
  .transform((value) => value.trim())
  .superRefine((value, ctx) => {
    const length = countUnicodeCharacters(value);

    if (length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Instruction must contain at least 1 character',
      });
    }

    if (length > 400) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Instruction must be 400 characters or fewer',
      });
    }
  });

export const SubagentManifestSchema = z.object({
  apiVersion: ApiVersionSchema,
  kind: z.literal('Subagent'),
  metadata: z.object({
    name: z.string().min(1),
    version: z.string().regex(SemverRegex, 'Version must be in semver format (x.y.z)'),
    instruction: InstructionSummarySchema,
    description: z.string().optional(),
    domains: z.array(z.string()).optional(),
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
    agent: z.object({
      path: z.string().min(1),
    }),
    schemas: z.object({
      input: z.string().optional(),
      output: z.string().optional(),
      memory: z.string().optional(),
    }).optional(),
    injection: z.object({
      hosts: z.object({
        claude_code: HostInjectionConfigSchema.optional(),
        codex: HostInjectionConfigSchema.optional(),
        copilot: HostInjectionConfigSchema.optional(),
        opencode: HostInjectionConfigSchema.optional(),
      }).optional(),
    }).optional(),
    skills: LayeredSkillsSchema.optional(),
    tools: ToolPolicySchema.optional(),
    permissions: PermissionPolicySchema.optional(),
    memory: z.object({
      scope: z.enum(['run', 'repo', 'project', 'workspace']),
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
}).superRefine((manifest, ctx) => {
  const universalSkillNames = findDuplicateSkillNames(manifest.spec.skills?.universal ?? []);
  for (const duplicateName of universalSkillNames) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['spec', 'skills', 'universal'],
      message: `Duplicate skill name in universal layer: ${duplicateName}`,
    });
  }

  const compatibleHosts = new Set<string>(manifest.spec.compatibility?.hosts ?? []);
  for (const [host, skills] of Object.entries(manifest.spec.skills?.hosts ?? {})) {
    if (!skills) {
      continue;
    }

    const duplicateNames = findDuplicateSkillNames(skills);
    for (const duplicateName of duplicateNames) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['spec', 'skills', 'hosts', host],
        message: `Duplicate skill name in ${host} layer: ${duplicateName}`,
      });
    }

    if (manifest.spec.compatibility?.hosts && !compatibleHosts.has(host)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['spec', 'skills', 'hosts', host],
        message: `Skill host layer must be declared in spec.compatibility.hosts: ${host}`,
      });
    }
  }
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

export function parseManifest(input: unknown): SubagentManifest {
  return SubagentManifestSchema.parse(input);
}
