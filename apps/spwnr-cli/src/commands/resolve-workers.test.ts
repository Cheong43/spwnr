import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Command } from 'commander'
import { mkdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { makeResolveWorkersCommand } from './resolve-workers.js'

const {
  searchPackagesMock,
  buildCoveragePlanMock,
  infoMock,
  closeMock,
  injectStaticMock,
} = vi.hoisted(() => ({
  searchPackagesMock: vi.fn(),
  buildCoveragePlanMock: vi.fn(),
  infoMock: vi.fn(),
  closeMock: vi.fn(),
  injectStaticMock: vi.fn(),
}))

vi.mock('@spwnr/registry', () => ({
  RegistryService: vi.fn().mockImplementation(() => ({
    searchPackages: searchPackagesMock,
    buildCoveragePlan: buildCoveragePlanMock,
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
        apiVersion: 'spwnr/v1',
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
    buildCoveragePlanMock.mockReturnValue({
      preferredDomain: null,
      units: [],
      recommendedSelection: [],
      uncoveredUnitIds: [],
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
    expect(payload.policySource).toBe('file')
    expect(payload.policy.selectionMode).toBe('dynamic')
    expect(payload.policy.lineup).toEqual({
      minAgents: 1,
      maxAgents: 4,
    })
    expect(payload.searchQuery).toBe('Build a backend API')
    expect(payload.candidates[0].agentName).toBe('api-architect')
    expect(payload.candidates[1].agentName).toBe('qa-auditor')
    expect(payload.unitCoverage).toBeNull()
    expect(payload.missingMinimumSelection).toBe(true)
    expect(payload.selectionSource).toBe('none')
  })

  it('falls back to the default dynamic policy when .claude-plugin/workers.json is missing', async () => {
    unlinkSync(resolve(tempDir, '.claude-plugin', 'workers.json'))

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

    const payload = JSON.parse(stdoutSpy.mock.calls.map(([value]) => String(value)).join(''))
    expect(payload.policyPath).toBeNull()
    expect(payload.policySource).toBe('default')
    expect(payload.policy).toMatchObject({
      selectionMode: 'dynamic',
      registrySource: 'local',
      selectionMethod: 'llm_choose',
      missingPolicy: 'auto_install_local',
      lineup: {
        minAgents: 1,
        maxAgents: 4,
      },
    })
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
    expect(payload.selectionSource).toBe('explicit')
  })

  it('auto-selects the top candidate for --ensure when no explicit or coverage selection is provided', async () => {
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
      '--ensure',
    ])

    expect(injectStaticMock).toHaveBeenCalledTimes(1)
    expect(injectStaticMock).toHaveBeenCalledWith(expect.objectContaining({
      packageName: 'api-architect',
      host: 'claude_code',
      scope: 'project',
    }))

    const payload = JSON.parse(stdoutSpy.mock.calls.map(([value]) => String(value)).join(''))
    expect(payload.selected).toEqual(['api-architect'])
    expect(payload.ensured).toEqual([
      expect.objectContaining({ name: 'api-architect', status: 'injected' }),
    ])
    expect(payload.selectionSource).toBe('candidate-pool')
    expect(payload.missingMinimumSelection).toBe(false)
  })

  it('builds a per-unit coverage plan and can auto-select that recommendation for --ensure', async () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    buildCoveragePlanMock.mockReturnValue({
      preferredDomain: null,
      units: [
        {
          unitId: 'build-api',
          taskBrief: 'Implement the backend API',
          preferredDomain: null,
          candidates: [
            {
              agentName: 'api-architect',
              version: '0.1.0',
              summary: 'Design and implement backend APIs.',
              domains: ['Develop'],
              hosts: ['claude_code'],
              score: 0.95,
            },
          ],
        },
        {
          unitId: 'review-api',
          taskBrief: 'Review tests and edge cases',
          preferredDomain: null,
          candidates: [
            {
              agentName: 'qa-auditor',
              version: '0.1.0',
              summary: 'Validate edge cases and test plans.',
              domains: ['Develop'],
              hosts: ['claude_code'],
              score: 0.91,
            },
          ],
        },
      ],
      recommendedSelection: [
        { agentName: 'api-architect', coversUnitIds: ['build-api'] },
        { agentName: 'qa-auditor', coversUnitIds: ['review-api'] },
      ],
      uncoveredUnitIds: [],
    })

    const program = new Command()
    program.addCommand(makeResolveWorkersCommand())

    await program.parseAsync([
      'node',
      'spwnr',
      'resolve-workers',
      '--search',
      'Implement and validate a backend API',
      '--host',
      'claude_code',
      '--format',
      'json',
      '--ensure',
      '--unit',
      'build-api::Implement the backend API',
      '--unit',
      'review-api::Review tests and edge cases',
    ])

    expect(searchPackagesMock).toHaveBeenCalledTimes(1)
    expect(buildCoveragePlanMock).toHaveBeenCalledTimes(1)
    expect(injectStaticMock).toHaveBeenCalledTimes(2)

    const payload = JSON.parse(stdoutSpy.mock.calls.map(([value]) => String(value)).join(''))
    expect(payload.selectionSource).toBe('coverage-recommendation')
    expect(payload.selected).toEqual(['api-architect', 'qa-auditor'])
    expect(payload.unitCoverage).toMatchObject({
      preferredDomain: null,
      units: [
        expect.objectContaining({ unitId: 'build-api' }),
        expect.objectContaining({ unitId: 'review-api' }),
      ],
      recommendedSelection: [
        expect.objectContaining({ agentName: 'api-architect', coversUnitIds: ['build-api'] }),
        expect.objectContaining({ agentName: 'qa-auditor', coversUnitIds: ['review-api'] }),
      ],
      uncoveredUnitIds: [],
    })
  })

  it('forwards preferredDomain from workers.json into search and coverage planning', async () => {
    writeFileSync(
      resolve(tempDir, '.claude-plugin', 'workers.json'),
      JSON.stringify({
        selectionMode: 'dynamic',
        registrySource: 'local',
        selectionMethod: 'llm_choose',
        missingPolicy: 'auto_install_local',
        preferredDomain: 'Develop',
        lineup: {
          minAgents: 1,
          maxAgents: 4,
        },
      }),
    )

    const program = new Command()
    program.addCommand(makeResolveWorkersCommand())

    await program.parseAsync([
      'node',
      'spwnr',
      'resolve-workers',
      '--search',
      'Implement and validate a backend API',
      '--host',
      'claude_code',
      '--format',
      'json',
      '--unit',
      'build-api::Implement the backend API',
    ])

    expect(searchPackagesMock).toHaveBeenCalledWith(expect.objectContaining({
      domain: 'Develop',
    }))
    expect(buildCoveragePlanMock).toHaveBeenCalledWith(expect.objectContaining({
      preferredDomain: 'Develop',
    }))
  })
})
