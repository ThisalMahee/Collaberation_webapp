import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg, { type Pool } from 'pg'
import { loadConfig } from '../config'

/**
 * The minimal query surface the data layer depends on. Both `pg.Pool` and
 * in-process PGlite can be used through it.
 */
export interface Queryable {
  query<T extends { [key: string]: unknown } = { [key: string]: unknown }>(
    text: string,
    params?: unknown[]
  ): Promise<{ rows: T[]; rowCount: number | null }>
}

/** A real pg connection pool for production/runtime use. */
export function createPool(connectionString: string): Pool {
  return new pg.Pool({ connectionString, ssl: false })
}

let defaultQueryable: Queryable | null = null

/** Lazily create the process-wide pool from DATABASE_URL on first use. */
export function getDefaultQueryable(): Queryable {
  if (defaultQueryable === null) {
    defaultQueryable = asQueryable(createPool(loadConfig().databaseUrl))
  }
  return defaultQueryable
}

/**
 * Adapt a query-like client to {@link Queryable}. This normalizes PGlite's
 * optional `rowCount` to the `number | null` shape that pg returns.
 */
export function asQueryable(source: {
  query<T>(text: string, params?: unknown[]): Promise<{ rows: T[]; rowCount?: number | null }>
}): Queryable {
  return {
    query: <T extends { [key: string]: unknown } = { [key: string]: unknown }>(
      text: string,
      params?: unknown[]
    ): Promise<{ rows: T[]; rowCount: number | null }> =>
      source.query<T>(text, params).then((result) => ({
        rows: result.rows,
        rowCount: result.rowCount ?? null,
      })),
  }
}

const migrationFile = join(dirname(fileURLToPath(import.meta.url)), 'migrations', '001_initial.sql')

/**
 * Apply all migrations. The SQL file is split into individual statements so
 * this works with clients (such as PGlite) that reject multi-statement strings.
 * Safe to call repeatedly.
 */
export async function runMigrations(db: Queryable): Promise<void> {
  const sql = readFileSync(migrationFile, 'utf8')
  const statements = sql
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0)
  for (const statement of statements) {
    await db.query(statement)
  }
}
