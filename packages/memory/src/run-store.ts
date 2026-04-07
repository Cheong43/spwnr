import type Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import { OrchexError, ErrorCodes } from '@orchex/core-types'
import type { RunStatus } from '@orchex/core-types'

export interface RunRow {
  id: string
  package_name: string
  version: string
  status: string
  input_json: string
  output_json: string | null
  error_json: string | null
  trace_id: string
  backend: string | null
  created_at: string
  updated_at: string
}

export interface CreateRunOpts {
  packageName: string
  version: string
  input: unknown
  traceId?: string
  backend?: string
}

export class RunStore {
  constructor(private readonly db: Database.Database) {}

  create(opts: CreateRunOpts): RunRow {
    const id = randomUUID()
    const traceId = opts.traceId ?? randomUUID()
    this.db.prepare(
      `INSERT INTO runs (id, package_name, version, status, input_json, trace_id, backend)
       VALUES (?, ?, ?, 'CREATED', ?, ?, ?)`
    ).run(id, opts.packageName, opts.version, JSON.stringify(opts.input), traceId, opts.backend ?? null)
    return this.get(id)!
  }

  updateStatus(runId: string, status: RunStatus, extra?: { output?: unknown; error?: unknown; backend?: string }): RunRow {
    const existing = this.get(runId)
    if (!existing) throw new OrchexError(ErrorCodes.RUN_NOT_FOUND, `Run ${runId} not found`)

    this.db.prepare(
      `UPDATE runs SET status = ?, output_json = ?, error_json = ?, backend = COALESCE(?, backend),
       updated_at = datetime('now') WHERE id = ?`
    ).run(
      status,
      extra?.output !== undefined ? JSON.stringify(extra.output) : existing.output_json,
      extra?.error !== undefined ? JSON.stringify(extra.error) : existing.error_json,
      extra?.backend ?? null,
      runId
    )
    return this.get(runId)!
  }

  get(runId: string): RunRow | null {
    return this.db.prepare<[string], RunRow>('SELECT * FROM runs WHERE id = ?').get(runId) ?? null
  }

  list(packageName?: string): RunRow[] {
    if (packageName) {
      return this.db.prepare<[string], RunRow>('SELECT * FROM runs WHERE package_name = ? ORDER BY created_at DESC').all(packageName)
    }
    return this.db.prepare<[], RunRow>('SELECT * FROM runs ORDER BY created_at DESC').all()
  }
}
