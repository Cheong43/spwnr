import { describe, it, expect, vi, afterEach } from 'vitest'
import { makeListCommand } from './list.js'
import { Command } from 'commander'

vi.mock('@spwnr/registry', () => ({
  RegistryService: vi.fn().mockImplementation(() => ({
    list: vi.fn().mockReturnValue([
      { name: 'code-reviewer', versions: ['0.2.0', '0.1.0'], latestVersion: '0.2.0' },
    ]),
    close: vi.fn(),
  })),
}))

describe('list command', () => {
  afterEach(() => vi.clearAllMocks())

  it('makeListCommand() returns a Command named "list"', () => {
    expect(makeListCommand().name()).toBe('list')
  })

  it('has alias "ls"', () => {
    expect(makeListCommand().alias()).toBe('ls')
  })

  it('prints "No packages published." when empty', async () => {
    const { RegistryService } = await import('@spwnr/registry')
    vi.mocked(RegistryService).mockImplementationOnce(() => ({
      list: vi.fn().mockReturnValue([]),
      close: vi.fn(),
    }) as any)

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const program = new Command()
    program.addCommand(makeListCommand())
    await program.parseAsync(['node', 'spwnr', 'list'])

    expect(consoleSpy).toHaveBeenCalledWith('No packages published.')
  })

  it('prints package names with versions', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const program = new Command()
    program.addCommand(makeListCommand())
    await program.parseAsync(['node', 'spwnr', 'list'])

    const output = consoleSpy.mock.calls.flat().join('\n')
    expect(output).toContain('code-reviewer')
    expect(output).toContain('0.2.0')
    expect(output).toContain('0.1.0')
  })

  it('shows latest version in header line', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const program = new Command()
    program.addCommand(makeListCommand())
    await program.parseAsync(['node', 'spwnr', 'list'])

    const firstCall = consoleSpy.mock.calls[0][0] as string
    expect(firstCall).toContain('latest: 0.2.0')
  })
})
