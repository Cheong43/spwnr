import type Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import { OrchexError, ErrorCodes } from '@orchex/core-types'
import type { RunRecord, RunStatus, BackendType } from '@orchex/core-types'

export interface RunRow {
  id: string
  package_name: string
  version: string
  status: string
  input_json: string
  output_json: string | null
  error_code: string | null
  trace_id: string
  backend: string | null
  created_at: string
  started_at: string | null
  ended_at: string | null
  updated_at: string
}

export interface CreateRunOpts {
  packageName: string
  version: string
  input: unknown
  traceId?: string
  backend?: string
}

const TERMINAL_STATUSES: RunStatus[] = ['COMPLETED', 'FAILED', 'CANCELLED']

function rowToRecord(row: RunRow): RunRecord {
  return {
    runId: row.id,
    subagentName: row.package_name,
    subagentVersion: row.version,
    status: row.status as RunStatus,
    traceId: row.trace_id,
    backend: (row.backend ?? 'simulated') as BackendType,
    input: JSON.parse(row.input_json),
    output: row.output_json ? JSON.parse(row.output_json) : undefined,
    errorCode: row.error_code ?? undefined,
    createdAt: row.created_at,
    startedAt: row.started_at ?? undefined,
    endedAt: row.ended_at ?? undefined,
  }
}

export class RunStore {
  constructor(private readonly db: Database.Database) {}

  create(opts: CreateRunOpts): RunRecord {
    const id = randomUUID()
    const traceId = opts.traceId ?? randomUUID()
    this.db.prepare(
      `INSERT INTO runs (id, package_name, version, status, input_json, trace_id, backend)
       VALUES (?, ?, ?, 'CREATED', ?, ?, ?)`
    ).run(id, opts.packageName, opts.version, JSON.stringify(opts.input), traceId, opts.backend ?? null)
    return rowToRecord(this.db.prepare<[string], RunRow>('SELECT * FROM runs WHERE id = ?').get(id)!)
  }

  updateStatus(runId: string, status: RunStatus, extra?: Partial<RunRecord>): RunRecord {
    const existing = this.db.prepare<[string], RunRow>('SELECT * FROM runs WHERE id = ?').get(runId) ?? null
    if (!existing) throw new OrchexError(ErrorCodes.RUN_NOT_FOUND, `Run ${runId} not found`)

    if (TERMINAL_STATUSES.includes(existing.status as RunStatus)) {
      throw new OrchexError(
        ErrorCodes.RUN_ALREADY_COMPLETED,
        `Run ${runId} is already in terminal state ${existing.status}`
      )
    }

    this.db.prepare(
      `UPDATE runs SET
         status = ?,
         output_json = ?,
         error_code = ?,
         backend = COALESCE(?, backend),
         started_at = COALESCE(?, started_at),
         ended_at = COALESCE(?, ended_at),
         updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      status,
      extra?.output !== undefined ? JSON.stringify(extra.output) : existing.output_json,
      extra?.errorCode !== undefined ? extra.errorCode : existing.error_code,
      extra?.backend ?? null,
      extra?.startedAt ?? null,
      extra?.endedAt ?? null,
      runId
    )
    return rowToRecord(this.db.prepare<[string], RunRow>('SELECT * FROM runs WHERE id = ?').get(runId)!)
  }

  get(runId: string): RunRecord | null {
    const row = this.db.prepare<[string], RunRow>('SELECT * FROM runs WHERE id = ?').get(runId) ?? null
    return row ? rowToRecord(row) : null
  }

  list(packageName?: string): RunRecord[] {
    if (packageName) {
      return this.db.prepare<[string], RunRow>(
        'SELECT * FROM runs WHERE package_name = ? ORDER BY created_at DESC'
      ).all(packageName).map(rowToRecord)
    }
    return this.db.prepare<[], RunRow>('SELECT * FROM runs ORDER BY created_at DESC').all().map(rowToRecord)
  }
}

