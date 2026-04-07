import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { PolicyMerger } from './policy-merger.js'
import type { PolicyRule } from '@orchex/core-types'

const allow = (pattern: string): PolicyRule => ({ pattern, decision: 'allow' })
const deny = (pattern: string): PolicyRule => ({ pattern, decision: 'deny' })
const ask = (pattern: string): PolicyRule => ({ pattern, decision: 'ask' })

describe('PolicyMerger', () => {
  let merger: PolicyMerger

  beforeEach(() => {
    merger = new PolicyMerger()
  })

  it('merge() with empty package policy returns defaults', () => {
    const result = merger.merge({ packagePolicy: [] })
    expect(result.maxRetries).toBe(2)
    expect(result.timeoutMs).toBe(60_000)
    expect(result.requiresApproval).toBe(false)
    expect(result.allowedTools).toEqual([])
    expect(result.deniedTools).toEqual([])
  })

  it('merge() ALLOW decision goes into allowedTools', () => {
    const result = merger.merge({ packagePolicy: [allow('read_file')] })
    expect(result.allowedTools).toContain('read_file')
    expect(result.deniedTools).not.toContain('read_file')
  })

  it('merge() DENY decision goes into deniedTools', () => {
    const result = merger.merge({ packagePolicy: [deny('exec')] })
    expect(result.deniedTools).toContain('exec')
    expect(result.allowedTools).not.toContain('exec')
  })

  it('merge() ASK decision sets requiresApproval=true', () => {
    const result = merger.merge({ packagePolicy: [ask('shell')] })
    expect(result.requiresApproval).toBe(true)
  })

  it('org policy overrides package policy for same tool', () => {
    const result = merger.merge({
      packagePolicy: [allow('bash')],
      orgPolicy: [deny('bash')],
    })
    expect(result.deniedTools).toContain('bash')
    expect(result.allowedTools).not.toContain('bash')
  })

  it('request policy overrides org policy for same tool', () => {
    const result = merger.merge({
      packagePolicy: [deny('read_file')],
      orgPolicy: [deny('read_file')],
      requestPolicy: [allow('read_file')],
    })
    expect(result.allowedTools).toContain('read_file')
    expect(result.deniedTools).not.toContain('read_file')
  })

  it('DENY wins over ALLOW at same level for duplicate patterns', () => {
    // Two rules for same pattern at package level: allow first, then deny
    const result = merger.merge({
      packagePolicy: [allow('bash'), deny('bash')],
    })
    expect(result.deniedTools).toContain('bash')
    expect(result.allowedTools).not.toContain('bash')
  })

  it('loadOrgPolicy() returns [] when file does not exist', () => {
    const rules = merger.loadOrgPolicy('/nonexistent/path/that/does/not/exist')
    expect(rules).toEqual([])
  })

  describe('loadOrgPolicy() parses rules from a YAML file', () => {
    const testDir = join(process.cwd(), '.test-policy-tmp')
    const configDir = join(testDir, 'config')

    beforeEach(() => {
      mkdirSync(configDir, { recursive: true })
      writeFileSync(
        join(configDir, 'org-policy.yaml'),
        'rules:\n  - pattern: read_file\n    decision: allow\n  - pattern: exec\n    decision: deny\n'
      )
    })

    afterEach(() => {
      if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true })
    })

    it('returns parsed rules array', () => {
      const rules = merger.loadOrgPolicy(testDir)
      expect(rules).toHaveLength(2)
      expect(rules[0]).toMatchObject({ pattern: 'read_file', decision: 'allow' })
      expect(rules[1]).toMatchObject({ pattern: 'exec', decision: 'deny' })
    })
  })

  it('merge() respects maxRetries — always returns default 2', () => {
    // PolicyRule has no maxRetries field; default should always be 2
    const result = merger.merge({
      packagePolicy: [allow('tool_a'), allow('tool_b')],
    })
    expect(result.maxRetries).toBe(2)
  })
})
