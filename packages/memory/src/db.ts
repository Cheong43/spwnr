import { openDatabase, getSpwnrHome, getDbPath, type SqliteDatabase } from '@spwnr/registry'

export { getSpwnrHome }
export { getDbPath as getMemoryDbPath }

export function openRunDatabase(dbPath?: string): SqliteDatabase {
  const db = openDatabase(dbPath)
  runMemoryMigrations(db)
  return db
}

function runMemoryMigrations(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      package_name TEXT NOT NULL,
      version TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'CREATED',
      input_json TEXT NOT NULL,
      output_json TEXT,
      error_code TEXT,
      trace_id TEXT NOT NULL,
      backend TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      started_at TEXT,
      ended_at TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS checkpoints (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
      step_name TEXT NOT NULL,
      state_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS agent_memory (
      id TEXT PRIMARY KEY,
      package_name TEXT NOT NULL,
      key TEXT NOT NULL,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(package_name, key)
    );

    CREATE INDEX IF NOT EXISTS idx_runs_package ON runs(package_name);
    CREATE INDEX IF NOT EXISTS idx_checkpoints_run ON checkpoints(run_id);
    CREATE INDEX IF NOT EXISTS idx_memory_package ON agent_memory(package_name);
  `)
}
