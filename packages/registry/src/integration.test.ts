import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { RegistryService } from './registry-service.js'
import { mkdirSync, existsSync, rmSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const EXAMPLE_PKG = resolve(__dirname, '../../../examples/code-reviewer')

describe('Integration: full publish→list→info→install cycle', () => {
  let tmpBase: string
  let dbPath: string
  let svc: RegistryService

  beforeEach(() => {
    tmpBase = join(tmpdir(), randomUUID())
    mkdirSync(tmpBase, { recursive: true })
    process.env.ORCHEX_HOME = tmpBase
    dbPath = join(tmpBase, 'test.db')
    svc = new RegistryService(dbPath)
  })

  afterEach(() => {
    svc.close()
    rmSync(tmpBase, { recursive: true, force: true })
    delete process.env.ORCHEX_HOME
  })

  it('publish() succeeds for examples/code-reviewer', async () => {
    const result = await svc.publish(EXAMPLE_PKG)
    expect(result.name).toBe('code-reviewer')
    expect(result.version).toBe('0.1.0')
    expect(result.signature).toMatch(/^[a-f0-9]{64}$/)
    expect(existsSync(result.tarballPath)).toBe(true)
  })

  it('list() shows published package after publish', async () => {
    await svc.publish(EXAMPLE_PKG)
    const packages = svc.list()
    expect(packages).toHaveLength(1)
    expect(packages[0].name).toBe('code-reviewer')
    expect(packages[0].versions).toContain('0.1.0')
    expect(packages[0].latestVersion).toBe('0.1.0')
  })

  it('info() returns correct manifest after publish', async () => {
    await svc.publish(EXAMPLE_PKG)
    const info = svc.info('code-reviewer', '0.1.0')
    expect(info.name).toBe('code-reviewer')
    expect(info.version).toBe('0.1.0')
    expect(info.manifest.apiVersion).toBe('subagent.io/v0.1')
    expect(info.manifest.kind).toBe('Subagent')
    expect(info.signature).toMatch(/^[a-f0-9]{64}$/)
  })

  it('info() with "latest" returns the published version', async () => {
    await svc.publish(EXAMPLE_PKG)
    const info = svc.info('code-reviewer')
    expect(info.version).toBe('0.1.0')
  })

  it('install() extracts subagent.yaml into installed dir', async () => {
    await svc.publish(EXAMPLE_PKG)
    const result = await svc.install('code-reviewer', '0.1.0')
    expect(result.installedDir).toBeDefined()
    expect(existsSync(join(result.installedDir, 'subagent.yaml'))).toBe(true)
  })

  it('install() with "latest" resolves correctly', async () => {
    await svc.publish(EXAMPLE_PKG)
    const result = await svc.install('code-reviewer')
    expect(result.version).toBe('0.1.0')
    expect(existsSync(join(result.installedDir, 'subagent.yaml'))).toBe(true)
  })

  it('install() verifies signature integrity (no tampering)', async () => {
    await svc.publish(EXAMPLE_PKG)
    await expect(svc.install('code-reviewer', '0.1.0')).resolves.toBeDefined()
  })

  it('publish() throws VERSION_CONFLICT on duplicate', async () => {
    await svc.publish(EXAMPLE_PKG)
    await expect(svc.publish(EXAMPLE_PKG)).rejects.toMatchObject({ code: 'VERSION_CONFLICT' })
  })

  it('install() throws PACKAGE_NOT_FOUND for unknown package', async () => {
    await expect(svc.install('no-such-package')).rejects.toMatchObject({ code: 'PACKAGE_NOT_FOUND' })
  })

  it('full cycle: publish → list → info → install all succeed', async () => {
    const published = await svc.publish(EXAMPLE_PKG)
    expect(published.name).toBe('code-reviewer')

    const list = svc.list()
    expect(list.some((p) => p.name === 'code-reviewer')).toBe(true)

    const info = svc.info('code-reviewer', '0.1.0')
    expect(info.signature).toBe(published.signature)

    const installed = await svc.install('code-reviewer', '0.1.0')
    expect(existsSync(join(installed.installedDir, 'subagent.yaml'))).toBe(true)
  })
})
