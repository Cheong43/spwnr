import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Command } from 'commander'
import { makeRunCommand } from './run.js'

vi.mock('@orchex/broker', () => ({
  RuntimeBroker: vi.fn(),
  BackendSelector: vi.fn(),
  RetryStrategy: vi.fn(),
}))

vi.mock('@orchex/adapters', () => ({
  AdapterRegistry: vi.fn(),
  SimulatedAdapter: vi.fn(),
  OpenCodeAdapter: vi.fn(),
  ClaudeAdapter: vi.fn(),
}))

vi.mock('@orchex/memory', () => ({
  openRunDatabase: vi.fn().mockReturnValue({}),
  RunStore: vi.fn(),
  CheckpointStore: vi.fn(),
  AgentMemoryStore: vi.fn(),
  ArtifactStore: vi.fn(),
}))

vi.mock('@orchex/registry', () => ({
  RegistryService: vi.fn(),
}))

vi.mock('@orchex/policy', () => ({
  PolicyMerger: vi.fn(),
}))

const mockRun = vi.fn()

async function runProgram(args: string[]) {
  const program = new Command()
  program.exitOverride()
  program.addCommand(makeRunCommand())
  await program.parseAsync(['node', 'orchex', ...args])
}

describe('run command', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    const { RuntimeBroker } = await import('@orchex/broker')
    const { AdapterRegistry } = await import('@orchex/adapters')

    vi.mocked(AdapterRegistry).mockImplementation(() => ({
      register: vi.fn(),
      getAll: vi.fn().mockReturnValue([]),
    }) as any)

    mockRun.mockResolvedValue({
      runId: 'run-abc-123',
      status: 'COMPLETED',
      artifacts: [],
    })

    vi.mocked(RuntimeBroker).mockImplementation(() => ({
      run: mockRun,
    }) as any)
  })

  it('calls broker.run with correct name, no version, empty input', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)

    await runProgram(['run', 'my-pkg'])

    expect(mockRun).toHaveBeenCalledWith(
      expect.objectContaining({
        packageName: 'my-pkg',
        version: undefined,
        input: {},
      }),
    )
  })

  it('passes version and parsed input when provided', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)

    await runProgram(['run', 'my-pkg', '1.0.0', '--input', '{"key":"val"}'])

    expect(mockRun).toHaveBeenCalledWith(
      expect.objectContaining({
        packageName: 'my-pkg',
        version: '1.0.0',
        input: { key: 'val' },
      }),
    )
  })

  it('passes backendPreference when --backend is specified', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)

    await runProgram(['run', 'my-pkg', '--backend', 'simulated'])

    expect(mockRun).toHaveBeenCalledWith(
      expect.objectContaining({
        backendPreference: 'simulated',
      }),
    )
  })

  it('prints runId and status on successful run', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)

    await runProgram(['run', 'my-pkg'])

    const output = consoleSpy.mock.calls.flat().join('\n')
    expect(output).toContain('run-abc-123')
    expect(output).toContain('COMPLETED')
  })

  it('calls process.exit(1) when broker returns FAILED status', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)

    mockRun.mockResolvedValueOnce({
      runId: 'run-fail-456',
      status: 'FAILED',
      artifacts: [],
      error: 'INTERNAL_ERROR',
    })

    await runProgram(['run', 'my-pkg'])

    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('prints error and calls process.exit(1) for invalid JSON in --input', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)

    await runProgram(['run', 'my-pkg', '--input', 'not-valid-json'])

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('--input must be valid JSON'))
    expect(exitSpy).toHaveBeenCalledWith(1)
    expect(mockRun).not.toHaveBeenCalled()
  })
})
