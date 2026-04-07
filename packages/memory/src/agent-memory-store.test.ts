import { describe, it, expect, beforeEach } from 'vitest'
import { openMemoryDatabase } from '../src/db.js'
import { AgentMemoryStore } from '../src/agent-memory-store.js'
import type Database from 'better-sqlite3'

let db: Database.Database
let store: AgentMemoryStore

beforeEach(() => {
  db = openMemoryDatabase(':memory:')
  store = new AgentMemoryStore(db)
})

describe('AgentMemoryStore', () => {
  it('set() + get() round-trips a value', () => {
    store.set('pkg-a', 'count', 42)
    expect(store.get('pkg-a', 'count')).toBe(42)
  })

  it('set() is idempotent — second set updates value', () => {
    store.set('pkg-a', 'count', 1)
    store.set('pkg-a', 'count', 2)
    expect(store.get('pkg-a', 'count')).toBe(2)
  })

  it('get() returns null for unknown key', () => {
    expect(store.get('pkg-a', 'no-key')).toBeNull()
  })

  it('getAll() returns all keys for package', () => {
    store.set('pkg-a', 'x', 1)
    store.set('pkg-a', 'y', 'hello')
    store.set('pkg-b', 'z', true)
    const all = store.getAll('pkg-a')
    expect(all).toEqual({ x: 1, y: 'hello' })
  })

  it('delete() removes the key', () => {
    store.set('pkg-a', 'tmp', 'value')
    store.delete('pkg-a', 'tmp')
    expect(store.get('pkg-a', 'tmp')).toBeNull()
  })

  it('delete() is a no-op for non-existent key', () => {
    expect(() => store.delete('pkg-a', 'ghost')).not.toThrow()
  })
})
