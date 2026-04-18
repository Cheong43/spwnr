import { describe, it, expect, beforeEach } from 'vitest'
import { openRunDatabase } from './db.js'
import { RunStore } from './run-store.js'
import { SpwnrError } from '@spwnr/core-types'
import type { SqliteDatabase } from '@spwnr/registry'

let db: SqliteDatabase
let store: RunStore

beforeEach(() => {
  db = openRunDatabase(':memory:')
  store = new RunStore(db)
})

describe('RunStore', () => {
  it('create() returns RunRecord with status CREATED', () => {
    const record = store.create({ packageName: 'pkg-a', version: '1.0.0', input: { x: 1 } })
    expect(record.status).toBe('CREATED')
    expect(record.subagentName).toBe('pkg-a')
    expect(record.subagentVersion).toBe('1.0.0')
    expect(record.input).toEqual({ x: 1 })
  })

  it('create() generates unique runId and traceId', () => {
    const r1 = store.create({ packageName: 'pkg-a', version: '1.0.0', input: {} })
    const r2 = store.create({ packageName: 'pkg-a', version: '1.0.0', input: {} })
    expect(r1.runId).not.toBe(r2.runId)
    expect(r1.traceId).not.toBe(r2.traceId)
    expect(r1.runId).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('updateStatus() changes status to provided value', () => {
    const run = store.create({ packageName: 'pkg-a', version: '1.0.0', input: {} })
    const updated = store.updateStatus(run.runId, 'RUNNING')
    expect(updated.status).toBe('RUNNING')
  })

  it('updateStatus() persists output', () => {
    const run = store.create({ packageName: 'pkg-a', version: '1.0.0', input: {} })
    const updated = store.updateStatus(run.runId, 'COMPLETED', { output: { result: 42 } })
    expect(updated.output).toEqual({ result: 42 })
  })

  it('updateStatus() persists errorCode', () => {
    const run = store.create({ packageName: 'pkg-a', version: '1.0.0', input: {} })
    const updated = store.updateStatus(run.runId, 'FAILED', { errorCode: 'ERR_CODE' })
    expect(updated.errorCode).toBe('ERR_CODE')
  })

  it('updateStatus() throws RUN_NOT_FOUND for unknown id', () => {
    let err: unknown
    try { store.updateStatus('no-such-id', 'RUNNING') } catch (e) { err = e }
    expect(err).toBeInstanceOf(SpwnrError)
    expect((err as SpwnrError).code).toBe('RUN_NOT_FOUND')
  })

  it('updateStatus() throws RUN_ALREADY_COMPLETED when run is in terminal state', () => {
    const run = store.create({ packageName: 'pkg-a', version: '1.0.0', input: {} })
    store.updateStatus(run.runId, 'COMPLETED')
    let err: unknown
    try { store.updateStatus(run.runId, 'RUNNING') } catch (e) { err = e }
    expect(err).toBeInstanceOf(SpwnrError)
    expect((err as SpwnrError).code).toBe('RUN_ALREADY_COMPLETED')
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
