import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { loadWorkerPolicy } from './worker-policy.js'

describe('loadWorkerPolicy', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = join(tmpdir(), randomUUID())
    mkdirSync(join(tempDir, '.claude-plugin'), { recursive: true })
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('normalizes malformed policy values back to the dynamic defaults', () => {
    writeFileSync(
      join(tempDir, '.claude-plugin', 'workers.json'),
      JSON.stringify({
        selectionMode: 'manual',
        registrySource: 'remote',
        selectionMethod: 'first_match',
        missingPolicy: 'fail',
        lineup: {
          minAgents: 0,
          maxAgents: 0,
        },
      }),
    )

    expect(loadWorkerPolicy(tempDir)).toMatchObject({
      source: 'file',
      policy: {
        selectionMode: 'dynamic',
        registrySource: 'local',
        selectionMethod: 'llm_choose',
        missingPolicy: 'auto_install_local',
        lineup: {
          minAgents: 1,
          maxAgents: 1,
        },
      },
    })
  })

  it('omits a blank preferredDomain while preserving a non-empty one', () => {
    writeFileSync(
      join(tempDir, '.claude-plugin', 'workers.json'),
      JSON.stringify({
        preferredDomain: '   ',
        lineup: {
          minAgents: 2,
          maxAgents: 4,
        },
      }),
    )

    expect(loadWorkerPolicy(tempDir).policy).not.toHaveProperty('preferredDomain')

    writeFileSync(
      join(tempDir, '.claude-plugin', 'workers.json'),
      JSON.stringify({
        preferredDomain: 'Develop',
        lineup: {
          minAgents: 2,
          maxAgents: 4,
        },
      }),
    )

    expect(loadWorkerPolicy(tempDir).policy).toMatchObject({
      preferredDomain: 'Develop',
      lineup: {
        minAgents: 2,
        maxAgents: 4,
      },
    })
  })
})
