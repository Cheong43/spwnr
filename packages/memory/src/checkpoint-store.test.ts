import { describe, it, expect, beforeEach } from 'vitest'
import { openMemoryDatabase } from '../src/db.js'
import { RunStore } from '../src/run-store.js'
import { CheckpointStore } from '../src/checkpoint-store.js'
import type Database from 'better-sqlite3'

let db: Database.Database
let runStore: RunStore
let store: CheckpointStore
let runId: string

beforeEach(() => {
  db = openMemoryDatabase(':memory:')
  runStore = new RunStore(db)
  store = new CheckpointStore(db)
  runId = runStore.create({ packageName: 'pkg-a', version: '1.0.0', input: {} }).id
})

describe('CheckpointStore', () => {
  it('save() creates checkpoint with correct run_id and step_name', () => {
    const cp = store.save(runId, 'step-1', { counter: 0 })
    expect(cp.run_id).toBe(runId)
    expect(cp.step_name).toBe('step-1')
    expect(cp.state_json).toBe(JSON.stringify({ counter: 0 }))
  })

  it('load() returns most recent checkpoint for run+step', () => {
    store.save(runId, 'step-1', { counter: 0 })
    store.save(runId, 'step-1', { counter: 1 })
    const cp = store.load(runId, 'step-1')
    expect(cp).not.toBeNull()
    expect(JSON.parse(cp!.state_json)).toEqual({ counter: 1 })
  })

  it('load() returns null for unknown combination', () => {
    expect(store.load(runId, 'no-step')).toBeNull()
    expect(store.load('no-run', 'step-1')).toBeNull()
  })

  it('listForRun() returns all checkpoints ordered by created_at ASC', () => {
    store.save(runId, 'step-1', { a: 1 })
    store.save(runId, 'step-2', { b: 2 })
    store.save(runId, 'step-3', { c: 3 })
    const list = store.listForRun(runId)
    expect(list).toHaveLength(3)
    expect(list[0].step_name).toBe('step-1')
    expect(list[2].step_name).toBe('step-3')
  })

  it('listForRun() returns empty array for run with no checkpoints', () => {
    const other = runStore.create({ packageName: 'pkg-b', version: '1.0.0', input: {} })
    expect(store.listForRun(other.id)).toEqual([])
  })
})
