import type Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import type { CheckpointRecord } from '@orchex/core-types'

export interface CheckpointRow {
  id: string
  run_id: string
  step_name: string
  state_json: string
  created_at: string
}

function rowToRecord(row: CheckpointRow): CheckpointRecord {
  return {
    checkpointId: row.id,
    runId: row.run_id,
    workflowStep: row.step_name,
    state: JSON.parse(row.state_json),
    createdAt: row.created_at,
  }
}

export class CheckpointStore {
  constructor(private readonly db: Database.Database) {}

  save(runId: string, stepName: string, state: unknown): CheckpointRecord {
    const id = randomUUID()
    this.db.prepare(
      'INSERT INTO checkpoints (id, run_id, step_name, state_json) VALUES (?, ?, ?, ?)'
    ).run(id, runId, stepName, JSON.stringify(state))
    return rowToRecord(this.db.prepare<[string], CheckpointRow>('SELECT * FROM checkpoints WHERE id = ?').get(id)!)
  }

  load(runId: string, stepName: string): CheckpointRecord | null {
    const row = this.db.prepare<[string, string], CheckpointRow>(
      'SELECT * FROM checkpoints WHERE run_id = ? AND step_name = ? ORDER BY rowid DESC LIMIT 1'
    ).get(runId, stepName) ?? null
    return row ? rowToRecord(row) : null
  }

  listForRun(runId: string): CheckpointRecord[] {
    return this.db.prepare<[string], CheckpointRow>(
      'SELECT * FROM checkpoints WHERE run_id = ? ORDER BY created_at ASC'
    ).all(runId).map(rowToRecord)
  }
}

