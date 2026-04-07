import type { EffectivePolicy, OpenCodePermissions, ClaudePermissions } from './types.js'

/**
 * Maps EffectivePolicy to OpenCode permissions format.
 * OpenCode uses explicit allow + deny lists.
 */
export function mapToOpenCode(policy: EffectivePolicy): OpenCodePermissions {
  return {
    allow: policy.allowedTools,
    deny: policy.deniedTools,
  }
}

/**
 * Maps EffectivePolicy to Claude Code permissions format.
 * Claude Code uses an allowlist only (denied tools simply not included).
 */
export function mapToClaudeCode(policy: EffectivePolicy): ClaudePermissions {
  return {
    allowedTools: policy.allowedTools.filter(t => !policy.deniedTools.includes(t)),
  }
}
