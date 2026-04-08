import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { RegistryService } from './registry-service.js'
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

function createTestPackage(dir: string, name = 'test-agent', version = '0.1.0') {
  mkdirSync(join(dir, 'schemas'), { recursive: true })

  writeFileSync(
    join(dir, 'subagent.yaml'),
    `apiVersion: subagent.io/v0.2
kind: Subagent
metadata:
  name: ${name}
  version: ${version}
  instruction: Review changes carefully.
spec:
  agent:
    path: ./agent.md
  schemas:
    input: ./schemas/input.json
    output: ./schemas/output.json
`,
  )
  writeFileSync(join(dir, 'agent.md'), '# Test Agent\n\nReview changes carefully.')
  writeFileSync(join(dir, 'schemas', 'input.json'), '{"type":"object"}')
  writeFileSync(join(dir, 'schemas', 'output.json'), '{"type":"object"}')
}

describe('RegistryService', () => {
  let tmpBase: string
  let dbPath: string
  let svc: RegistryService

  beforeEach(() => {
    tmpBase = join(tmpdir(), randomUUID())
    mkdirSync(tmpBase, { recursive: true })
    process.env.SPWNR_HOME = tmpBase
    dbPath = join(tmpBase, 'test.db')
    svc = new RegistryService(dbPath)
  })

  afterEach(() => {
    svc?.close()
    rmSync(tmpBase, { recursive: true, force: true })
    delete process.env.SPWNR_HOME
  })

  it('publish() returns name, version, signature, tarballPath', async () => {
    const pkgDir = join(tmpBase, 'test-agent')
    mkdirSync(pkgDir)
    createTestPackage(pkgDir)

    const result = await svc.publish(pkgDir)
    expect(result.name).toBe('test-agent')
    expect(result.version).toBe('0.1.0')
    expect(result.signature).toMatch(/^[a-f0-9]{64}$/)
    expect(result.tarballPath).toMatch(/\.tar\.gz$/)
  })

  it('publish() creates tarball on disk', async () => {
    const pkgDir = join(tmpBase, 'test-agent')
    mkdirSync(pkgDir)
    createTestPackage(pkgDir)

    const result = await svc.publish(pkgDir)
    expect(existsSync(result.tarballPath)).toBe(true)
  })

  it('publish() throws VERSION_CONFLICT on duplicate version', async () => {
    const pkgDir = join(tmpBase, 'test-agent')
    mkdirSync(pkgDir)
    createTestPackage(pkgDir)

    await svc.publish(pkgDir)
    await expect(svc.publish(pkgDir)).rejects.toMatchObject({ code: 'VERSION_CONFLICT' })
  })

  it('list() returns empty array when no packages', () => {
    expect(svc.list()).toEqual([])
  })

  it('list() returns published packages with versions', async () => {
    const pkgDir = join(tmpBase, 'test-agent')
    mkdirSync(pkgDir)
    createTestPackage(pkgDir)
    await svc.publish(pkgDir)

    const list = svc.list()
    expect(list).toHaveLength(1)
    expect(list[0].name).toBe('test-agent')
    expect(list[0].versions).toContain('0.1.0')
  })

  it('info() throws PACKAGE_NOT_FOUND for unknown package', () => {
    expect(() => svc.info('no-such-pkg')).toThrowError()
  })

  it('info() returns manifest, signature, publishedAt', async () => {
    const pkgDir = join(tmpBase, 'test-agent')
    mkdirSync(pkgDir)
    createTestPackage(pkgDir)
    await svc.publish(pkgDir)

    const info = svc.info('test-agent', '0.1.0')
    expect(info.name).toBe('test-agent')
    expect(info.version).toBe('0.1.0')
    expect(info.manifest).toBeDefined()
    expect(info.signature).toMatch(/^[a-f0-9]{64}$/)
    expect(info.publishedAt).toBeDefined()
  })

  it('info() with "latest" returns most recent version', async () => {
    const pkgDir = join(tmpBase, 'test-agent')
    mkdirSync(pkgDir)
    createTestPackage(pkgDir)
    await svc.publish(pkgDir)

    const info = svc.info('test-agent', 'latest')
    expect(info.version).toBe('0.1.0')
  })

  it('install() extracts package to installed dir', async () => {
    const pkgDir = join(tmpBase, 'test-agent')
    mkdirSync(pkgDir)
    createTestPackage(pkgDir)
    await svc.publish(pkgDir)

    const result = await svc.install('test-agent', '0.1.0')
    expect(result.installedDir).toBeDefined()
    expect(existsSync(join(result.installedDir, 'subagent.yaml'))).toBe(true)
  })

  it('install() with "latest" resolves to most recent version', async () => {
    const pkgDir = join(tmpBase, 'test-agent')
    mkdirSync(pkgDir)
    createTestPackage(pkgDir)
    await svc.publish(pkgDir)

    const result = await svc.install('test-agent')
    expect(result.version).toBe('0.1.0')
  })

  it('install() throws PACKAGE_NOT_FOUND for unknown package', async () => {
    await expect(svc.install('no-such-pkg')).rejects.toMatchObject({ code: 'PACKAGE_NOT_FOUND' })
  })
})
