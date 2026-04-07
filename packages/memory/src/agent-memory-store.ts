import type Database from 'better-sqlite3'
import { randomUUID } from 'crypto'

export interface AgentMemoryRow {
  id: string
  package_name: string
  key: string
  value_json: string
  updated_at: string
}

export class AgentMemoryStore {
  constructor(private readonly db: Database.Database) {}

  set(packageName: string, key: string, value: unknown): void {
    this.db.prepare(
      `INSERT INTO agent_memory (id, package_name, key, value_json, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(package_name, key)
       DO UPDATE SET value_json = excluded.value_json, updated_at = datetime('now')`
    ).run(randomUUID(), packageName, key, JSON.stringify(value))
  }

  get(packageName: string, key: string): unknown | null {
    const row = this.db.prepare<[string, string], AgentMemoryRow>(
      'SELECT * FROM agent_memory WHERE package_name = ? AND key = ?'
    ).get(packageName, key)
    return row ? JSON.parse(row.value_json) : null
  }

  getAll(packageName: string): Record<string, unknown> {
    const rows = this.db.prepare<[string], AgentMemoryRow>(
      'SELECT * FROM agent_memory WHERE package_name = ?'
    ).all(packageName)
    return Object.fromEntries(rows.map(r => [r.key, JSON.parse(r.value_json)]))
  }

  delete(packageName: string, key: string): void {
    this.db.prepare('DELETE FROM agent_memory WHERE package_name = ? AND key = ?').run(packageName, key)
  }
}
