import { describe, it, expect } from 'vitest'
import { mapToOpenCode, mapToClaudeCode } from './mappers.js'
import type { EffectivePolicy } from './types.js'

const emptyPolicy: EffectivePolicy = {
  allowedTools: [],
  deniedTools: [],
  maxRetries: 2,
  timeoutMs: 60_000,
  requiresApproval: false,
  rawDecisions: {},
}

describe('mapToOpenCode', () => {
  it('returns { allow: [], deny: [] } for empty policy', () => {
    expect(mapToOpenCode(emptyPolicy)).toEqual({ allow: [], deny: [] })
  })

  it('includes allowed tools in allow array', () => {
    const policy: EffectivePolicy = { ...emptyPolicy, allowedTools: ['read_file', 'write_file'] }
    const result = mapToOpenCode(policy)
    expect(result.allow).toEqual(['read_file', 'write_file'])
  })

  it('includes denied tools in deny array', () => {
    const policy: EffectivePolicy = { ...emptyPolicy, deniedTools: ['exec', 'shell'] }
    const result = mapToOpenCode(policy)
    expect(result.deny).toEqual(['exec', 'shell'])
  })
})

describe('mapToClaudeCode', () => {
  it('returns { allowedTools: [] } for empty policy', () => {
    expect(mapToClaudeCode(emptyPolicy)).toEqual({ allowedTools: [] })
  })

  it('includes allowed tools', () => {
    const policy: EffectivePolicy = { ...emptyPolicy, allowedTools: ['read_file', 'write_file'] }
    const result = mapToClaudeCode(policy)
    expect(result.allowedTools).toEqual(['read_file', 'write_file'])
  })

  it('excludes tools that are in deniedTools even if also in allowedTools', () => {
    const policy: EffectivePolicy = {
      ...emptyPolicy,
      allowedTools: ['read_file', 'exec'],
      deniedTools: ['exec'],
    }
    const result = mapToClaudeCode(policy)
    expect(result.allowedTools).toContain('read_file')
    expect(result.allowedTools).not.toContain('exec')
  })
})
