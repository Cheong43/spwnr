import { describe, it, expect, vi, afterEach } from 'vitest'
import { makeInfoCommand } from './info.js'
import { Command } from 'commander'

const mockInfo = {
  name: 'code-reviewer',
  version: '0.1.0',
  manifest: { apiVersion: 'subagent.io/v0.1', kind: 'Subagent', metadata: { name: 'code-reviewer', version: '0.1.0' }, spec: {} },
  signature: 'abc'.padEnd(64, '0'),
  tarballPath: '/tmp/.orchex/tarballs/code-reviewer/0.1.0.tar.gz',
  publishedAt: '2024-01-01T00:00:00Z',
}

vi.mock('@orchex/registry', () => ({
  RegistryService: vi.fn().mockImplementation(() => ({
    info: vi.fn().mockReturnValue(mockInfo),
    close: vi.fn(),
  })),
}))

describe('info command', () => {
  afterEach(() => vi.clearAllMocks())

  it('makeInfoCommand() returns a Command named "info"', () => {
    expect(makeInfoCommand().name()).toBe('info')
  })

  it('accepts <name> and optional [version] arguments', () => {
    const cmd = makeInfoCommand()
    expect(cmd.registeredArguments[0].name()).toBe('name')
    expect(cmd.registeredArguments[1].required).toBe(false)
  })

  it('prints all fields: Name, Version, Published, Signature, Tarball', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const program = new Command()
    program.addCommand(makeInfoCommand())
    await program.parseAsync(['node', 'orchex', 'info', 'code-reviewer'])

    const output = consoleSpy.mock.calls.flat().join('\n')
    expect(output).toContain('Name:')
    expect(output).toContain('Version:')
    expect(output).toContain('Published:')
    expect(output).toContain('Signature:')
    expect(output).toContain('Tarball:')
  })

  it('calls process.exit(1) on error', async () => {
    const { RegistryService } = await import('@orchex/registry')
    vi.mocked(RegistryService).mockImplementationOnce(() => ({
      info: vi.fn().mockImplementation(() => { throw new Error('PACKAGE_NOT_FOUND') }),
      close: vi.fn(),
    }) as any)

    vi.spyOn(console, 'error').mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)

    const program = new Command()
    program.addCommand(makeInfoCommand())
    await program.parseAsync(['node', 'orchex', 'info', 'no-such-pkg'])

    expect(exitSpy).toHaveBeenCalledWith(1)
  })
})
