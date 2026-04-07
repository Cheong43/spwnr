import type Database from 'better-sqlite3'
import { randomUUID } from 'crypto'

export interface CheckpointRow {
  id: string
  run_id: string
  step_name: string
  state_json: string
  created_at: string
}

export class CheckpointStore {
  constructor(private readonly db: Database.Database) {}

  save(runId: string, stepName: string, state: unknown): CheckpointRow {
    const id = randomUUID()
    this.db.prepare(
      'INSERT INTO checkpoints (id, run_id, step_name, state_json) VALUES (?, ?, ?, ?)'
    ).run(id, runId, stepName, JSON.stringify(state))
    return this.db.prepare<[string], CheckpointRow>('SELECT * FROM checkpoints WHERE id = ?').get(id)!
  }

  load(runId: string, stepName: string): CheckpointRow | null {
    return this.db.prepare<[string, string], CheckpointRow>(
      'SELECT * FROM checkpoints WHERE run_id = ? AND step_name = ? ORDER BY rowid DESC LIMIT 1'
    ).get(runId, stepName) ?? null
  }

  listForRun(runId: string): CheckpointRow[] {
    return this.db.prepare<[string], CheckpointRow>(
      'SELECT * FROM checkpoints WHERE run_id = ? ORDER BY created_at ASC'
    ).all(runId)
  }
}
