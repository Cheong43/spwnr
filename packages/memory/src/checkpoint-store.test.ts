import { describe, it, expect, beforeEach } from 'vitest'
import { openRunDatabase } from './db.js'
import { RunStore } from './run-store.js'
import { CheckpointStore } from './checkpoint-store.js'
import type { SqliteDatabase } from '@spwnr/registry'

let db: SqliteDatabase
let runStore: RunStore
let store: CheckpointStore
let runId: string

beforeEach(() => {
  db = openRunDatabase(':memory:')
  runStore = new RunStore(db)
  store = new CheckpointStore(db)
  runId = runStore.create({ packageName: 'pkg-a', version: '1.0.0', input: {} }).runId
})

describe('CheckpointStore', () => {
  it('save() creates checkpoint with correct runId and workflowStep', () => {
    const cp = store.save(runId, 'step-1', { counter: 0 })
    expect(cp.runId).toBe(runId)
    expect(cp.workflowStep).toBe('step-1')
    expect(cp.state).toEqual({ counter: 0 })
  })

  it('load() returns most recent checkpoint for run+step', () => {
    store.save(runId, 'step-1', { counter: 0 })
    store.save(runId, 'step-1', { counter: 1 })
    const cp = store.load(runId, 'step-1')
    expect(cp).not.toBeNull()
    expect(cp!.state).toEqual({ counter: 1 })
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
    expect(list[0].workflowStep).toBe('step-1')
    expect(list[2].workflowStep).toBe('step-3')
  })

  it('listForRun() returns empty array for run with no checkpoints', () => {
    const other = runStore.create({ packageName: 'pkg-b', version: '1.0.0', input: {} })
    expect(store.listForRun(other.runId)).toEqual([])
  })
})
