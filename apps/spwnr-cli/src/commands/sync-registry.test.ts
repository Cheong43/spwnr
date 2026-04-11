import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Command } from 'commander'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { makeSyncRegistryCommand } from './sync-registry.js'

const publishMock = vi.fn()
const listMock = vi.fn()
const closeMock = vi.fn()

vi.mock('@spwnr/registry', () => ({
  RegistryService: vi.fn().mockImplementation(() => ({
    publish: publishMock,
    list: listMock,
    close: closeMock,
  })),
}))

function createTemplateVersion(baseDir: string, name: string, version: string) {
  const versionDir = join(baseDir, 'templates', name, version)
  mkdirSync(versionDir, { recursive: true })
  writeFileSync(join(versionDir, 'subagent.yaml'), 'apiVersion: spwnr/v0.3\n')
}

describe('sync-registry command', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = join(tmpdir(), randomUUID())
    mkdirSync(tempDir, { recursive: true })
    createTemplateVersion(tempDir, 'backend-developer', '0.1.0')
    createTemplateVersion(tempDir, 'frontend-developer', '0.1.0')

    listMock.mockReturnValue([
      {
        name: 'backend-developer',
        versions: ['0.1.0'],
        latestVersion: '0.1.0',
      },
    ])
    publishMock.mockResolvedValue({
      name: 'frontend-developer',
      version: '0.1.0',
      signature: 'abc',
      tarballPath: '/tmp/frontend-developer.tar.gz',
    })
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
    vi.clearAllMocks()
  })

  it('makeSyncRegistryCommand() returns a Command named "sync-registry"', () => {
    expect(makeSyncRegistryCommand().name()).toBe('sync-registry')
  })

  it('publishes only missing package versions and prints a summary', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never)

    const program = new Command()
    program.addCommand(makeSyncRegistryCommand())
    await program.parseAsync(['node', 'spwnr', 'sync-registry', tempDir])

    expect(exitSpy).not.toHaveBeenCalled()
    expect(publishMock).toHaveBeenCalledTimes(1)
    expect(publishMock).toHaveBeenCalledWith(expect.stringContaining('frontend-developer/0.1.0'))

    const output = consoleLogSpy.mock.calls.flat().join('\n')
    expect(output).toContain('skipped backend-developer@0.1.0')
    expect(output).toContain('published frontend-developer@0.1.0')
    expect(output).toContain('Summary: published=1 skipped=1 failed=0')
  })
})
