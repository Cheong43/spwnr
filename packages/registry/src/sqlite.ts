import { createRequire } from 'node:module'

type SqliteModule = typeof import('node:sqlite')
const require = createRequire(import.meta.url)
const { DatabaseSync } = require('node:sqlite') as SqliteModule

type StatementParams<Params extends unknown[]> = Params extends [] ? unknown[] : Params

export interface PreparedStatement<Params extends unknown[] = [], Result = unknown> {
  get(...params: StatementParams<Params>): Result | undefined
  all(...params: StatementParams<Params>): Result[]
  run(...params: StatementParams<Params>): unknown
}

export interface SqliteDatabase {
  exec(sql: string): void
  close(): void
  prepare<Params extends unknown[] = [], Result = unknown>(
    sql: string,
  ): PreparedStatement<Params, Result>
}

export function createSqliteDatabase(path: string): SqliteDatabase {
  return new DatabaseSync(path) as unknown as SqliteDatabase
}
