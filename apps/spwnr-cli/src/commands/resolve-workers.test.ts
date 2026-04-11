import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Command } from 'commander'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { makeResolveWorkersCommand } from './resolve-workers.js'

const {
  searchPackagesMock,
  infoMock,
  closeMock,
  injectStaticMock,
} = vi.hoisted(() => ({
  searchPackagesMock: vi.fn(),
  infoMock: vi.fn(),
  closeMock: vi.fn(),
  injectStaticMock: vi.fn(),
}))

vi.mock('@spwnr/registry', () => ({
  RegistryService: vi.fn().mockImplementation(() => ({
    searchPackages: searchPackagesMock,
    info: infoMock,
    close: closeMock,
  })),
}))

vi.mock('@spwnr/injector', () => ({
  injectStatic: injectStaticMock,
  resolveDefaultStaticTarget: vi.fn().mockImplementation((_host: string, _scope: string) => '/tmp/default-agents'),
}))

function writeDynamicPolicy(cwd: string) {
  mkdirSync(resolve(cwd, '.claude-plugin'), { recursive: true })
  writeFileSync(
    resolve(cwd, '.claude-plugin', 'workers.json'),
    JSON.stringify({
      selectionMode: 'dynamic',
      registrySource: 'local',
      selectionMethod: 'llm_choose',
      missingPolicy: 'auto_install_local',
      lineup: {
        minAgents: 1,
        maxAgents: 4,
      },
    }),
  )
}

describe('resolve-workers command', () => {
  let tempDir: string
  let previousCwd: string

  beforeEach(() => {
    previousCwd = process.cwd()
    tempDir = join(tmpdir(), randomUUID())
    mkdirSync(tempDir, { recursive: true })
    writeDynamicPolicy(tempDir)
    process.chdir(tempDir)

    searchPackagesMock.mockReturnValue([
      {
        agentName: 'api-architect',
        version: '0.1.0',
        summary: 'Design and implement backend APIs.',
        domains: ['Develop'],
        hosts: ['claude_code'],
        score: 0.95,
      },
      {
        agentName: 'qa-auditor',
        version: '0.1.0',
        summary: 'Validate edge cases and test plans.',
        domains: ['Develop'],
        hosts: ['claude_code'],
        score: 0.87,
      },
    ])
    infoMock.mockImplementation((name: string) => ({
      name,
      version: '0.1.0',
      manifest: {
        apiVersion: 'subagent.io/v0.3',
        kind: 'Subagent',
        metadata: {
          name,
          version: '0.1.0',
          instruction: `${name} instruction`,
        },
        spec: {
          agent: { path: './agent.md' },
          compatibility: { hosts: ['claude_code'] },
        },
      },
    }))
    injectStaticMock.mockResolvedValue({
      host: 'claude_code',
      targetDir: '/tmp/default-agents',
      files: [],
      packageName: 'example',
      version: '0.1.0',
      installedDir: '/tmp/.spwnr/example',
    })
  })

  afterEach(() => {
    process.chdir(previousCwd)
    rmSync(tempDir, { recursive: true, force: true })
    vi.clearAllMocks()
  })

  it('makeResolveWorkersCommand() returns a Command named "resolve-workers"', () => {
    expect(makeResolveWorkersCommand().name()).toBe('resolve-workers')
  })

  it('prints a JSON candidate pool for the dynamic lineup policy', async () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const program = new Command()
    program.addCommand(makeResolveWorkersCommand())

    await program.parseAsync([
      'node',
      'spwnr',
      'resolve-workers',
      '--search',
      'Build a backend API',
      '--host',
      'claude_code',
      '--format',
      'json',
    ])

    expect(searchPackagesMock).toHaveBeenCalledTimes(1)
    expect(searchPackagesMock).toHaveBeenCalledWith(expect.objectContaining({
      query: 'Build a backend API',
      host: 'claude_code',
      limit: 8,
    }))

    const payload = JSON.parse(stdoutSpy.mock.calls.map(([value]) => String(value)).join(''))
    expect(payload.policy.selectionMode).toBe('dynamic')
    expect(payload.policy.lineup).toEqual({
      minAgents: 1,
      maxAgents: 4,
    })
    expect(payload.searchQuery).toBe('Build a backend API')
    expect(payload.candidates[0].agentName).toBe('api-architect')
    expect(payload.candidates[1].agentName).toBe('qa-auditor')
    expect(payload.missingMinimumSelection).toBe(true)
  })

  it('injects only missing selected packages when --ensure is used', async () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const targetDir = resolve(tempDir, 'agents')
    mkdirSync(targetDir, { recursive: true })
    writeFileSync(join(targetDir, 'qa-auditor.md'), 'already installed')

    const program = new Command()
    program.addCommand(makeResolveWorkersCommand())

    await program.parseAsync([
      'node',
      'spwnr',
      'resolve-workers',
      '--search',
      'Audit the codebase',
      '--host',
      'claude_code',
      '--format',
      'json',
      '--ensure',
      '--target',
      targetDir,
      '--select',
      'api-architect',
      '--select',
      'qa-auditor',
    ])

    expect(injectStaticMock).toHaveBeenCalledTimes(1)
    expect(injectStaticMock).toHaveBeenCalledWith(expect.objectContaining({
      packageName: 'api-architect',
      host: 'claude_code',
      scope: 'project',
      targetDir,
    }))

    const payload = JSON.parse(stdoutSpy.mock.calls.map(([value]) => String(value)).join(''))
    expect(payload.selected).toEqual(['api-architect', 'qa-auditor'])
    expect(payload.ensured).toEqual([
      expect.objectContaining({ name: 'api-architect', status: 'injected' }),
      expect.objectContaining({ name: 'qa-auditor', status: 'already_present' }),
    ])
  })
})
