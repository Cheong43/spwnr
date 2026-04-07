import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { parse as parseYaml } from 'yaml'
import type { PolicyRule } from '@orchex/core-types'
import type { PolicyInput, EffectivePolicy } from './types.js'

export class PolicyMerger {
  /**
   * Load org policy from ORCHEX_HOME/config/org-policy.yaml.
   * Returns [] if file doesn't exist.
   */
  loadOrgPolicy(orchexHome?: string): PolicyRule[] {
    const home = orchexHome ?? process.env.ORCHEX_HOME ?? join(process.env.HOME ?? '~', '.orchex')
    const configPath = join(home, 'config', 'org-policy.yaml')
    if (!existsSync(configPath)) return []
    try {
      const raw = parseYaml(readFileSync(configPath, 'utf-8'))
      return Array.isArray(raw?.rules) ? raw.rules : []
    } catch {
      return []
    }
  }

  /**
   * Merge 3 policy levels into an EffectivePolicy.
   * Priority: request > org > package (higher overrides lower).
   * Within same level, DENY wins over ALLOW.
   */
  merge(input: PolicyInput): EffectivePolicy {
    const decisions: Record<string, string> = {}

    // Level 1: package (lowest)
    for (const rule of input.packagePolicy ?? []) {
      this.applyRule(decisions, rule, false)
    }

    // Level 2: org
    for (const rule of input.orgPolicy ?? []) {
      this.applyRule(decisions, rule, true)
    }

    // Level 3: request (highest)
    for (const rule of input.requestPolicy ?? []) {
      this.applyRule(decisions, rule, true)
    }

    const allowedTools = Object.entries(decisions)
      .filter(([, d]) => d === 'allow')
      .map(([pattern]) => pattern)

    const deniedTools = Object.entries(decisions)
      .filter(([, d]) => d === 'deny')
      .map(([pattern]) => pattern)

    const requiresApproval = Object.values(decisions).some(d => d === 'ask')

    return {
      allowedTools,
      deniedTools,
      maxRetries: 2,
      timeoutMs: 60_000,
      requiresApproval,
      rawDecisions: decisions,
    }
  }

  private applyRule(
    decisions: Record<string, string>,
    rule: PolicyRule,
    override: boolean
  ): void {
    if (!rule.pattern || !rule.decision) return
    const existing = decisions[rule.pattern]
    if (!override && existing !== undefined) {
      // Within same level, deny wins over allow
      if (existing === 'deny') return
    }
    decisions[rule.pattern] = rule.decision
  }
}
