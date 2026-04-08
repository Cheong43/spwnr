import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { makePublishCommand } from './publish.js'
import { Command } from 'commander'
import { resolve } from 'path'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

// Mock RegistryService
vi.mock('@spwnr/registry', () => ({
  RegistryService: vi.fn().mockImplementation(() => ({
    publish: vi.fn().mockResolvedValue({
      name: 'test-agent',
      version: '0.1.0',
      signature: 'abc123'.padEnd(64, '0'),
      tarballPath: '/tmp/.spwnr/tarballs/test-agent/0.1.0.tar.gz',
    }),
    close: vi.fn(),
  })),
}))

describe('publish command', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('makePublishCommand() returns a Command named "publish"', () => {
    const cmd = makePublishCommand()
    expect(cmd.name()).toBe('publish')
  })

  it('accepts a <dir> argument', () => {
    const cmd = makePublishCommand()
    expect(cmd.registeredArguments[0].name()).toBe('dir')
  })

  it('logs success message on publish', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)

    const program = new Command()
    program.addCommand(makePublishCommand())
    await program.parseAsync(['node', 'spwnr', 'publish', '/some/dir'])

    expect(exitSpy).not.toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✓ Published test-agent@0.1.0'))
  })

  it('logs signature and tarball path on success', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)

    const program = new Command()
    program.addCommand(makePublishCommand())
    await program.parseAsync(['node', 'spwnr', 'publish', '/some/dir'])

    const calls = consoleSpy.mock.calls.flat().join('\n')
    expect(calls).toContain('Signature:')
    expect(calls).toContain('Tarball:')
  })

  it('calls process.exit(1) on publish error', async () => {
    const { RegistryService } = await import('@spwnr/registry')
    vi.mocked(RegistryService).mockImplementationOnce(() => ({
      publish: vi.fn().mockRejectedValue(new Error('VERSION_CONFLICT')),
      close: vi.fn(),
    }) as any)

    vi.spyOn(console, 'error').mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)

    const program = new Command()
    program.addCommand(makePublishCommand())
    await program.parseAsync(['node', 'spwnr', 'publish', '/some/dir'])

    expect(exitSpy).toHaveBeenCalledWith(1)
  })
})
