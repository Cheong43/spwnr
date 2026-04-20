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
        launchPolicy: {
          claude_code: {
            permissionModel: 'custom',
            writeIsolation: {
              mode: 'optional',
              autoEnter: 'yes',
              autoExit: 1,
              summaryTool: 'WrongTool',
              discoveryTool: 'WrongTool',
            },
          },
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
        launchPolicy: {
          claude_code: {
            permissionModel: 'explicit_allow_all',
            writeIsolation: {
              mode: 'worktree_required_for_mutation',
              autoEnter: true,
              autoExit: true,
              summaryTool: 'BriefTool',
              discoveryTool: 'ToolSearchTool',
            },
          },
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

  it('uses the repo-global Claude launch policy defaults when the file is missing', () => {
    expect(loadWorkerPolicy(tempDir)).toMatchObject({
      source: 'default',
      policy: {
        launchPolicy: {
          claude_code: {
            permissionModel: 'explicit_allow_all',
            writeIsolation: {
              mode: 'worktree_required_for_mutation',
              autoEnter: true,
              autoExit: true,
              summaryTool: 'BriefTool',
              discoveryTool: 'ToolSearchTool',
            },
          },
        },
      },
    })
  })

  it('preserves valid Claude launch policy overrides from workers.json', () => {
    writeFileSync(
      join(tempDir, '.claude-plugin', 'workers.json'),
      JSON.stringify({
        launchPolicy: {
          claude_code: {
            permissionModel: 'explicit_allow_all',
            writeIsolation: {
              mode: 'worktree_required_for_mutation',
              autoEnter: false,
              autoExit: false,
              summaryTool: 'BriefTool',
              discoveryTool: 'ToolSearchTool',
            },
          },
        },
      }),
    )

    expect(loadWorkerPolicy(tempDir).policy.launchPolicy.claude_code).toEqual({
      permissionModel: 'explicit_allow_all',
      writeIsolation: {
        mode: 'worktree_required_for_mutation',
        autoEnter: false,
        autoExit: false,
        summaryTool: 'BriefTool',
        discoveryTool: 'ToolSearchTool',
      },
    })
  })
})
