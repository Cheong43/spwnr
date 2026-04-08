import { describe, it, expect, afterEach } from 'vitest'
import { randomUUID } from 'crypto'
import { tmpdir } from 'os'
import { existsSync, rmSync } from 'fs'
import { join } from 'path'
import { openDatabase, getSpwnrHome } from './db.js'
import type Database from 'better-sqlite3'

function tempDbPath(): string {
  return join(tmpdir(), `${randomUUID()}.db`)
}

describe('db', () => {
  const openedDbs: Array<{ db: Database.Database; path: string }> = []

  afterEach(() => {
    for (const { db, path } of openedDbs) {
      try { db.close() } catch {}
      try { rmSync(path, { force: true }) } catch {}
    }
    openedDbs.length = 0
  })

  function open(path: string) {
    const db = openDatabase(path)
    openedDbs.push({ db, path })
    return db
  }

  it('creates DB file at given path', () => {
    const path = tempDbPath()
    open(path)
    expect(existsSync(path)).toBe(true)
  })

  it('creates packages table', () => {
    const path = tempDbPath()
    const db = open(path)
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='packages'")
      .get()
    expect(row).toBeTruthy()
  })

  it('creates package_versions table', () => {
    const path = tempDbPath()
    const db = open(path)
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='package_versions'")
      .get()
    expect(row).toBeTruthy()
  })

  it('calling openDatabase twice on same path is idempotent', () => {
    const path = tempDbPath()
    const db1 = open(path)
    expect(() => {
      const db2 = open(path)
      db2.close()
    }).not.toThrow()
    db1.close()
  })

  it('getSpwnrHome returns ~/.spwnr by default', () => {
    const saved = process.env.SPWNR_HOME
    delete process.env.SPWNR_HOME
    const home = process.env.HOME ?? '~'
    expect(getSpwnrHome()).toBe(join(home, '.spwnr'))
    if (saved !== undefined) process.env.SPWNR_HOME = saved
  })

  it('getSpwnrHome respects SPWNR_HOME env var', () => {
    const saved = process.env.SPWNR_HOME
    process.env.SPWNR_HOME = '/custom/spwnr'
    expect(getSpwnrHome()).toBe('/custom/spwnr')
    if (saved !== undefined) process.env.SPWNR_HOME = saved
    else delete process.env.SPWNR_HOME
  })
})
