import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TarballService } from './tarball-service.js'
import { mkdirSync, writeFileSync, existsSync, rmSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

describe('TarballService', () => {
  let tmpBase: string
  const svc = new TarballService()

  beforeEach(() => {
    tmpBase = join(tmpdir(), randomUUID())
    mkdirSync(tmpBase, { recursive: true })
  })

  afterEach(() => {
    rmSync(tmpBase, { recursive: true, force: true })
  })

  it('pack() creates a .tar.gz file at destPath', async () => {
    const srcDir = join(tmpBase, 'mypkg')
    mkdirSync(srcDir)
    writeFileSync(join(srcDir, 'subagent.yaml'), 'name: test')
    const dest = join(tmpBase, 'out', 'mypkg-0.1.0.tar.gz')
    await svc.pack(srcDir, dest)
    expect(existsSync(dest)).toBe(true)
  })

  it('pack() creates a non-empty archive', async () => {
    const srcDir = join(tmpBase, 'mypkg')
    mkdirSync(srcDir)
    writeFileSync(join(srcDir, 'subagent.yaml'), 'name: test')
    const dest = join(tmpBase, 'mypkg.tar.gz')
    await svc.pack(srcDir, dest)
    const stat = (await import('fs')).statSync(dest)
    expect(stat.size).toBeGreaterThan(0)
  })

  it('extract() unpacks files into destDir', async () => {
    const srcDir = join(tmpBase, 'mypkg')
    mkdirSync(srcDir)
    writeFileSync(join(srcDir, 'subagent.yaml'), 'name: test-pkg')
    const archive = join(tmpBase, 'mypkg.tar.gz')
    await svc.pack(srcDir, archive)

    const extractDir = join(tmpBase, 'extracted')
    await svc.extract(archive, extractDir)
    expect(existsSync(join(extractDir, 'subagent.yaml'))).toBe(true)
  })

  it('extract() preserves file contents', async () => {
    const content = 'apiVersion: subagent.io/v0.1\nkind: Subagent'
    const srcDir = join(tmpBase, 'mypkg')
    mkdirSync(srcDir)
    writeFileSync(join(srcDir, 'subagent.yaml'), content)
    const archive = join(tmpBase, 'mypkg.tar.gz')
    await svc.pack(srcDir, archive)

    const extractDir = join(tmpBase, 'extracted')
    await svc.extract(archive, extractDir)
    expect(readFileSync(join(extractDir, 'subagent.yaml'), 'utf-8')).toBe(content)
  })

  it('extract() creates destDir if it does not exist', async () => {
    const srcDir = join(tmpBase, 'mypkg')
    mkdirSync(srcDir)
    writeFileSync(join(srcDir, 'file.txt'), 'hello')
    const archive = join(tmpBase, 'mypkg.tar.gz')
    await svc.pack(srcDir, archive)

    const extractDir = join(tmpBase, 'new-dir', 'nested')
    await svc.extract(archive, extractDir)
    expect(existsSync(extractDir)).toBe(true)
  })
})
