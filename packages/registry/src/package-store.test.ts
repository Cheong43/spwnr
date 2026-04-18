import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { randomUUID } from 'crypto'
import { tmpdir } from 'os'
import { rmSync } from 'fs'
import { join } from 'path'
import { openDatabase } from './db.js'
import { PackageStore } from './package-store.js'
import { SpwnrError, ErrorCodes } from '@spwnr/core-types'
import type { SubagentManifest } from '@spwnr/core-types'
import type { SqliteDatabase } from './sqlite.js'

function tempDbPath(): string {
  return join(tmpdir(), `${randomUUID()}.db`)
}

function makeManifest(name: string, version: string, description?: string): SubagentManifest {
  return {
    apiVersion: 'spwnr/v1',
    kind: 'Subagent',
    metadata: {
      name,
      version,
      instruction: `Use ${name} directly.`,
      description,
    },
    spec: {
      agent: { path: './agent.md' },
    },
  }
}

describe('PackageStore', () => {
  let dbPath: string
  let db: SqliteDatabase
  let store: PackageStore

  beforeEach(() => {
    dbPath = tempDbPath()
    db = openDatabase(dbPath)
    store = new PackageStore(db)
  })

  afterEach(() => {
    try { db.close() } catch {}
    try { rmSync(dbPath, { force: true }) } catch {}
  })

  it('upsertPackage inserts a new package and returns an id', () => {
    const id = store.upsertPackage('my-pkg')
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })

  it('upsertPackage is idempotent — calling twice returns same id', () => {
    const id1 = store.upsertPackage('my-pkg')
    const id2 = store.upsertPackage('my-pkg')
    expect(id1).toBe(id2)
  })

  it('publishVersion inserts a version row and returns it', () => {
    const manifest = makeManifest('my-pkg', '1.0.0')
    const row = store.publishVersion({
      packageName: 'my-pkg',
      version: '1.0.0',
      manifest,
      signature: 'sig123',
      tarballPath: '/path/to/tarball.tgz',
    })
    expect(row.version).toBe('1.0.0')
    expect(row.signature).toBe('sig123')
    expect(row.tarball_path).toBe('/path/to/tarball.tgz')
    expect(JSON.parse(row.manifest_json)).toMatchObject({ metadata: { name: 'my-pkg' } })
  })

  it('publishVersion throws VERSION_CONFLICT if version already published', () => {
    const manifest = makeManifest('my-pkg', '1.0.0')
    const opts = {
      packageName: 'my-pkg',
      version: '1.0.0',
      manifest,
      signature: 'sig',
      tarballPath: '/path.tgz',
    }
    store.publishVersion(opts)
    expect(() => store.publishVersion(opts)).toThrow(SpwnrError)
    expect(() => store.publishVersion(opts)).toThrow(
      expect.objectContaining({ code: ErrorCodes.VERSION_CONFLICT }),
    )
  })

  it('listPackages returns empty array when no packages', () => {
    expect(store.listPackages()).toEqual([])
  })

  it('listPackages returns packages with nested versions array', () => {
    const manifest = makeManifest('pkg-a', '1.0.0')
    store.publishVersion({
      packageName: 'pkg-a',
      version: '1.0.0',
      manifest,
      signature: 's',
      tarballPath: '/t.tgz',
    })
    const list = store.listPackages()
    expect(list).toHaveLength(1)
    expect(list[0].name).toBe('pkg-a')
    expect(list[0].versions).toHaveLength(1)
    expect(list[0].versions[0].version).toBe('1.0.0')
  })

  it('getPackage returns null for unknown name', () => {
    expect(store.getPackage('nonexistent')).toBeNull()
  })

  it('getPackage returns package with versions for known name', () => {
    const manifest = makeManifest('pkg-b', '2.0.0')
    store.publishVersion({
      packageName: 'pkg-b',
      version: '2.0.0',
      manifest,
      signature: 's',
      tarballPath: '/t.tgz',
    })
    const pkg = store.getPackage('pkg-b')
    expect(pkg).not.toBeNull()
    expect(pkg!.name).toBe('pkg-b')
    expect(pkg!.versions).toHaveLength(1)
  })

  it('getVersion returns null for unknown version', () => {
    expect(store.getVersion('nonexistent', '1.0.0')).toBeNull()
  })

  it('getVersion returns the correct row', () => {
    const manifest = makeManifest('pkg-c', '3.0.0')
    store.publishVersion({
      packageName: 'pkg-c',
      version: '3.0.0',
      manifest,
      signature: 'sig-c',
      tarballPath: '/c.tgz',
    })
    const row = store.getVersion('pkg-c', '3.0.0')
    expect(row).not.toBeNull()
    expect(row!.version).toBe('3.0.0')
    expect(row!.signature).toBe('sig-c')
  })

  it('getLatestVersion returns null when no versions', () => {
    store.upsertPackage('empty-pkg')
    expect(store.getLatestVersion('empty-pkg')).toBeNull()
  })

  it('getLatestVersion returns the most recently published version', () => {
    const manifest1 = makeManifest('pkg-d', '1.0.0')
    const manifest2 = makeManifest('pkg-d', '2.0.0')
    store.publishVersion({
      packageName: 'pkg-d',
      version: '1.0.0',
      manifest: manifest1,
      signature: 's1',
      tarballPath: '/1.tgz',
    })
    store.publishVersion({
      packageName: 'pkg-d',
      version: '2.0.0',
      manifest: manifest2,
      signature: 's2',
      tarballPath: '/2.tgz',
    })
    const latest = store.getLatestVersion('pkg-d')
    expect(latest).not.toBeNull()
    expect(latest!.version).toBe('2.0.0')
  })
})
