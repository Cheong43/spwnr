import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { makeValidateCommand } from './validate.js'
import { Command } from 'commander'
import { resolve } from 'path'
import { mkdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

describe('validate command', () => {
  let tmpBase: string

  beforeEach(() => {
    tmpBase = resolve(tmpdir(), randomUUID())
    mkdirSync(tmpBase, { recursive: true })
  })

  afterEach(() => {
    rmSync(tmpBase, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  it('makeValidateCommand() returns a Command with name "validate"', () => {
    const cmd = makeValidateCommand()
    expect(cmd.name()).toBe('validate')
  })

  it('accepts a <dir> argument', () => {
    const cmd = makeValidateCommand()
    expect(cmd.registeredArguments[0].name()).toBe('dir')
  })

  it('has --strict option', () => {
    const cmd = makeValidateCommand()
    const opt = cmd.options.find(o => o.long === '--strict')
    expect(opt).toBeDefined()
  })

  it.each([
    'code-reviewer',
    'general-researcher',
    'general-executor',
    'general-reviewer',
  ])('prints success for valid package (examples/%s)', async (exampleName) => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)

    const cmd = makeValidateCommand()
    const program = new Command()
    program.addCommand(cmd)

    const examplesDir = resolve(__dirname, `../../../../examples/${exampleName}`)
    await program.parseAsync(['node', 'spwnr', 'validate', examplesDir])

    expect(exitSpy).not.toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✓'))
  })

  it('calls process.exit(1) for invalid directory', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)

    const cmd = makeValidateCommand()
    const program = new Command()
    program.addCommand(cmd)

    await program.parseAsync(['node', 'spwnr', 'validate', '/nonexistent/path/xyz'])

    expect(exitSpy).toHaveBeenCalledWith(1)
  })
})
