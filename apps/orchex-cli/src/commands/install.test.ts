import { describe, it, expect, vi, afterEach } from 'vitest'
import { makeInstallCommand } from './install.js'
import { Command } from 'commander'

vi.mock('@orchex/registry', () => ({
  RegistryService: vi.fn().mockImplementation(() => ({
    install: vi.fn().mockResolvedValue({
      name: 'code-reviewer',
      version: '0.1.0',
      installedDir: '/tmp/.orchex/packages/code-reviewer/0.1.0',
    }),
    close: vi.fn(),
  })),
}))

describe('install command', () => {
  afterEach(() => vi.clearAllMocks())

  it('makeInstallCommand() returns a Command named "install"', () => {
    expect(makeInstallCommand().name()).toBe('install')
  })

  it('accepts <name> and optional [version] arguments', () => {
    const cmd = makeInstallCommand()
    const args = cmd.registeredArguments
    expect(args[0].name()).toBe('name')
    expect(args[1].name()).toBe('version')
    expect(args[1].required).toBe(false)
  })

  it('logs success with name@version and location', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)

    const program = new Command()
    program.addCommand(makeInstallCommand())
    await program.parseAsync(['node', 'orchex', 'install', 'code-reviewer'])

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✓ Installed code-reviewer@0.1.0'))
    const allOutput = consoleSpy.mock.calls.flat().join('\n')
    expect(allOutput).toContain('Location:')
  })

  it('defaults version to "latest" when not provided', async () => {
    const { RegistryService } = await import('@orchex/registry')
    const installMock = vi.fn().mockResolvedValue({ name: 'pkg', version: '1.0.0', installedDir: '/tmp/x' })
    vi.mocked(RegistryService).mockImplementationOnce(() => ({ install: installMock, close: vi.fn() }) as any)

    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)

    const program = new Command()
    program.addCommand(makeInstallCommand())
    await program.parseAsync(['node', 'orchex', 'install', 'pkg'])

    expect(installMock).toHaveBeenCalledWith('pkg', 'latest')
  })

  it('calls process.exit(1) on error', async () => {
    const { RegistryService } = await import('@orchex/registry')
    vi.mocked(RegistryService).mockImplementationOnce(() => ({
      install: vi.fn().mockRejectedValue(new Error('PACKAGE_NOT_FOUND')),
      close: vi.fn(),
    }) as any)

    vi.spyOn(console, 'error').mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)

    const program = new Command()
    program.addCommand(makeInstallCommand())
    await program.parseAsync(['node', 'orchex', 'install', 'no-such-pkg'])

    expect(exitSpy).toHaveBeenCalledWith(1)
  })
})
