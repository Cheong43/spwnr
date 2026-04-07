import { describe, it, expect, beforeEach } from 'vitest'
import { openMemoryDatabase } from '../src/db.js'
import { RunStore } from '../src/run-store.js'
import { OrchexError } from '@orchex/core-types'
import type Database from 'better-sqlite3'

let db: Database.Database
let store: RunStore

beforeEach(() => {
  db = openMemoryDatabase(':memory:')
  store = new RunStore(db)
})

describe('RunStore', () => {
  it('create() returns RunRow with status CREATED', () => {
    const row = store.create({ packageName: 'pkg-a', version: '1.0.0', input: { x: 1 } })
    expect(row.status).toBe('CREATED')
    expect(row.package_name).toBe('pkg-a')
    expect(row.version).toBe('1.0.0')
    expect(row.input_json).toBe(JSON.stringify({ x: 1 }))
  })

  it('create() generates unique id and traceId', () => {
    const r1 = store.create({ packageName: 'pkg-a', version: '1.0.0', input: {} })
    const r2 = store.create({ packageName: 'pkg-a', version: '1.0.0', input: {} })
    expect(r1.id).not.toBe(r2.id)
    expect(r1.trace_id).not.toBe(r2.trace_id)
    expect(r1.id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('updateStatus() changes status to provided value', () => {
    const run = store.create({ packageName: 'pkg-a', version: '1.0.0', input: {} })
    const updated = store.updateStatus(run.id, 'RUNNING')
    expect(updated.status).toBe('RUNNING')
  })

  it('updateStatus() persists output JSON', () => {
    const run = store.create({ packageName: 'pkg-a', version: '1.0.0', input: {} })
    const updated = store.updateStatus(run.id, 'COMPLETED', { output: { result: 42 } })
    expect(updated.output_json).toBe(JSON.stringify({ result: 42 }))
  })

  it('updateStatus() persists error JSON', () => {
    const run = store.create({ packageName: 'pkg-a', version: '1.0.0', input: {} })
    const updated = store.updateStatus(run.id, 'FAILED', { error: { code: 'ERR' } })
    expect(updated.error_json).toBe(JSON.stringify({ code: 'ERR' }))
  })

  it('updateStatus() throws RUN_NOT_FOUND for unknown id', () => {
    let err: unknown
    try { store.updateStatus('no-such-id', 'RUNNING') } catch (e) { err = e }
    expect(err).toBeInstanceOf(OrchexError)
    expect((err as OrchexError).code).toBe('RUN_NOT_FOUND')
  })

  it('get() returns null for unknown id', () => {
    expect(store.get('no-such-id')).toBeNull()
  })

  it('list() returns all runs; list(packageName) filters by package', () => {
    store.create({ packageName: 'pkg-a', version: '1.0.0', input: {} })
    store.create({ packageName: 'pkg-a', version: '1.0.0', input: {} })
    store.create({ packageName: 'pkg-b', version: '1.0.0', input: {} })

    expect(store.list()).toHaveLength(3)
    expect(store.list('pkg-a')).toHaveLength(2)
    expect(store.list('pkg-b')).toHaveLength(1)
    expect(store.list('pkg-c')).toHaveLength(0)
  })
})
