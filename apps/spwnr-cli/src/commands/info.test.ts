import { describe, it, expect, vi, afterEach } from 'vitest'
import { makeInfoCommand } from './info.js'
import { Command } from 'commander'

const mockInfo = {
  name: 'code-reviewer',
  version: '0.1.0',
  manifest: {
    apiVersion: 'spwnr/v1',
    kind: 'Subagent',
    metadata: {
      name: 'code-reviewer',
      version: '0.1.0',
      instruction: 'Review git changes carefully.',
    },
    spec: {
      agent: { path: './agent.md' },
      schemas: {
        input: './schemas/input.schema.json',
        output: './schemas/output.schema.json',
      },
      compatibility: { hosts: ['claude_code', 'codex'] },
      injection: {
        hosts: {
          claude_code: {
            static: { enabled: true, defaultScope: 'project' },
            session: { enabled: true, defaultScope: 'user' },
          },
          codex: {
            static: { enabled: true, defaultScope: 'project' },
          },
        },
      },
    },
  },
  signature: 'abc'.padEnd(64, '0'),
  tarballPath: '/tmp/.spwnr/tarballs/code-reviewer/0.1.0.tar.gz',
  publishedAt: '2024-01-01T00:00:00Z',
}

vi.mock('@spwnr/registry', () => ({
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

  it('prints all fields including host matrix', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const program = new Command()
    program.addCommand(makeInfoCommand())
    await program.parseAsync(['node', 'spwnr', 'info', 'code-reviewer'])

    const output = consoleSpy.mock.calls.flat().join('\n')
    expect(output).toContain('Name:')
    expect(output).toContain('Version:')
    expect(output).toContain('Published:')
    expect(output).toContain('Signature:')
    expect(output).toContain('Tarball:')
    expect(output).toContain('Instruction:')
    expect(output).toContain('Schemas:')
    expect(output).toContain('Hosts:')
    expect(output).toContain('claude_code: static(project), session(user)')
  })

  it('calls process.exit(1) on error', async () => {
    const { RegistryService } = await import('@spwnr/registry')
    vi.mocked(RegistryService).mockImplementationOnce(() => ({
      info: vi.fn().mockImplementation(() => { throw new Error('PACKAGE_NOT_FOUND') }),
      close: vi.fn(),
    }) as any)

    vi.spyOn(console, 'error').mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)

    const program = new Command()
    program.addCommand(makeInfoCommand())
    await program.parseAsync(['node', 'spwnr', 'info', 'no-such-pkg'])

    expect(exitSpy).toHaveBeenCalledWith(1)
  })
})
