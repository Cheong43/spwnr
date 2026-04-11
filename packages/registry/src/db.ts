import Database from 'better-sqlite3'
import { join } from 'path'
import { mkdirSync } from 'fs'

export function getSpwnrHome(): string {
  return process.env.SPWNR_HOME ?? join(process.env.HOME ?? '~', '.spwnr')
}

export function getDbPath(): string {
  return join(getSpwnrHome(), 'sqlite', 'spwnr.db')
}

export function openDatabase(dbPath?: string): Database.Database {
  const path = dbPath ?? getDbPath()
  mkdirSync(join(path, '..'), { recursive: true })
  const db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  runMigrations(db)
  return db
}

function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS packages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS package_versions (
      id TEXT PRIMARY KEY,
      package_id TEXT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
      version TEXT NOT NULL,
      manifest_json TEXT NOT NULL,
      signature TEXT NOT NULL,
      tarball_path TEXT NOT NULL,
      published_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(package_id, version)
    );

    CREATE INDEX IF NOT EXISTS idx_pkg_versions_package_id
      ON package_versions(package_id);

    CREATE VIRTUAL TABLE IF NOT EXISTS package_search USING fts5(
      package_id UNINDEXED,
      version_id UNINDEXED,
      agent_name,
      version UNINDEXED,
      summary,
      instruction,
      description,
      domains,
      tags,
      persona_role,
      compatibility_hosts,
      tokenize = 'unicode61'
    );
  `)
}
