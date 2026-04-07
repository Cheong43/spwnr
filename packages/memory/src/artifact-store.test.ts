import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ArtifactStore } from './artifact-store.js'
import { join } from 'path'
import { rmSync, existsSync } from 'fs'
import { randomUUID } from 'crypto'

const TEST_HOME = join(process.cwd(), '.test-orchex-home-' + randomUUID())
let store: ArtifactStore
let runId: string

beforeEach(() => {
  process.env.ORCHEX_HOME = TEST_HOME
  store = new ArtifactStore()
  runId = randomUUID()
})

afterEach(() => {
  delete process.env.ORCHEX_HOME
  if (existsSync(TEST_HOME)) {
    rmSync(TEST_HOME, { recursive: true, force: true })
  }
})

describe('ArtifactStore', () => {
  it('write() creates file and returns full path', () => {
    const path = store.write(runId, 'out.txt', 'hello')
    expect(path).toContain('out.txt')
    expect(existsSync(path)).toBe(true)
  })

  it('read() retrieves written content', () => {
    store.write(runId, 'data.json', '{"ok":true}')
    const buf = store.read(runId, 'data.json')
    expect(buf).not.toBeNull()
    expect(buf!.toString()).toBe('{"ok":true}')
  })

  it('read() returns null for non-existent file', () => {
    expect(store.read(runId, 'ghost.txt')).toBeNull()
  })

  it('list() returns filenames in run dir', () => {
    store.write(runId, 'a.txt', 'a')
    store.write(runId, 'b.txt', 'b')
    const files = store.list(runId)
    expect(files).toContain('a.txt')
    expect(files).toContain('b.txt')
    expect(files).toHaveLength(2)
  })

  it('list() returns empty array for run with no artifacts', () => {
    expect(store.list('no-run-id')).toEqual([])
  })
})
