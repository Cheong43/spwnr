import { describe, it, expect } from 'vitest'
import { SignatureService } from './signature-service.js'
import type { SubagentManifest } from '@spwnr/core-types'

describe('SignatureService', () => {
  const service = new SignatureService()

  const manifest = {
    apiVersion: 'spwnr/v1',
    kind: 'Subagent' as const,
    metadata: {
      name: 'test',
      version: '1.0.0',
      instruction: 'Use the test agent directly.',
    },
    spec: {
      agent: { path: './agent.md' },
    },
  } satisfies SubagentManifest

  it('sign() returns a 64-char hex string', () => {
    const signature = service.sign(manifest)
    expect(signature).toMatch(/^[a-f0-9]{64}$/)
  })

  it('sign() returns same value for same manifest (deterministic)', () => {
    const sig1 = service.sign(manifest)
    const sig2 = service.sign(manifest)
    expect(sig1).toBe(sig2)
  })

  it('sign() returns different values for different manifests', () => {
    const manifest2 = {
      ...manifest,
      metadata: {
        ...manifest.metadata,
        name: 'test2',
        version: '1.0.0',
      },
    }
    const sig1 = service.sign(manifest)
    const sig2 = service.sign(manifest2)
    expect(sig1).not.toBe(sig2)
  })

  it('verify() returns true when signature matches', () => {
    const signature = service.sign(manifest)
    expect(service.verify(manifest, signature)).toBe(true)
  })

  it('verify() returns false when signature doesn\'t match', () => {
    const signature = service.sign(manifest)
    const modifiedManifest = {
      ...manifest,
      metadata: {
        ...manifest.metadata,
        name: 'modified',
        version: '1.0.0',
      },
    }
    expect(service.verify(modifiedManifest, signature)).toBe(false)
  })
})
