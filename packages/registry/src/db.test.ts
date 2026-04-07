import { describe, it, expect, afterEach } from 'vitest'
import { randomUUID } from 'crypto'
import { tmpdir } from 'os'
import { existsSync, rmSync } from 'fs'
import { join } from 'path'
import { openDatabase, getOrchexHome } from './db.js'
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

  it('getOrchexHome returns ~/.orchex by default', () => {
    const saved = process.env.ORCHEX_HOME
    delete process.env.ORCHEX_HOME
    const home = process.env.HOME ?? '~'
    expect(getOrchexHome()).toBe(join(home, '.orchex'))
    if (saved !== undefined) process.env.ORCHEX_HOME = saved
  })

  it('getOrchexHome respects ORCHEX_HOME env var', () => {
    const saved = process.env.ORCHEX_HOME
    process.env.ORCHEX_HOME = '/custom/orchex'
    expect(getOrchexHome()).toBe('/custom/orchex')
    if (saved !== undefined) process.env.ORCHEX_HOME = saved
    else delete process.env.ORCHEX_HOME
  })
})
