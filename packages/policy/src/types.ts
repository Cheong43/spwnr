import type { PolicyRule } from '@orchex/core-types'

export interface PolicyInput {
  packagePolicy: PolicyRule[]
  orgPolicy?: PolicyRule[]
  requestPolicy?: PolicyRule[]
}

export interface EffectivePolicy {
  allowedTools: string[]
  deniedTools: string[]
  maxRetries: number
  timeoutMs: number
  requiresApproval: boolean
  rawDecisions: Record<string, string>  // pattern -> PolicyDecision value
}

export interface OpenCodePermissions {
  allow: string[]
  deny: string[]
}

export interface ClaudePermissions {
  allowedTools: string[]
}
