import type { SnapshotMeta } from '@pad/shared'
import type { Queryable } from './pool'

/** Raw row shape returned by Postgres/PGlite for snapshot columns. */
type SnapshotRow = {
  id: number | string
  document_name: string
  kind: 'manual' | 'auto'
  label: string | null
  created_at: Date | string
  state?: Uint8Array
}

function toMeta(row: SnapshotRow): SnapshotMeta {
  return {
    id: Number(row.id),
    documentName: row.document_name,
    kind: row.kind,
    label: row.label,
    createdAt: new Date(row.created_at).toISOString(),
  }
}

const META_COLUMNS = 'id, document_name, kind, label, created_at'

export async function insertSnapshot(
  db: Queryable,
  input: { documentName: string; kind: 'manual' | 'auto'; label: string | null; state: Uint8Array }
): Promise<SnapshotMeta> {
  const { rows } = await db.query<SnapshotRow>(
    `INSERT INTO snapshots (document_name, kind, label, state)
     VALUES ($1, $2, $3, $4)
     RETURNING ${META_COLUMNS}`,
    [input.documentName, input.kind, input.label, input.state]
  )
  return toMeta(rows[0]!)
}

export async function listSnapshots(
  db: Queryable,
  documentName: string
): Promise<SnapshotMeta[]> {
  const { rows } = await db.query<SnapshotRow>(
    `SELECT ${META_COLUMNS} FROM snapshots
     WHERE document_name = $1
     ORDER BY created_at DESC, id DESC`,
    [documentName]
  )
  return rows.map(toMeta)
}

export async function getSnapshot(
  db: Queryable,
  documentName: string,
  id: number
): Promise<{ meta: SnapshotMeta; state: Uint8Array } | null> {
  const { rows } = await db.query<SnapshotRow>(
    `SELECT ${META_COLUMNS}, state FROM snapshots
     WHERE document_name = $1 AND id = $2`,
    [documentName, id]
  )
  if (rows.length === 0) return null
  const row = rows[0]!
  return { meta: toMeta(row), state: new Uint8Array(row.state!) }
}

export async function deleteSnapshot(
  db: Queryable,
  documentName: string,
  id: number
): Promise<boolean> {
  const result = await db.query(
    'DELETE FROM snapshots WHERE document_name = $1 AND id = $2',
    [documentName, id]
  )
  return (result.rowCount ?? 0) > 0
}

/** Keep only the newest `keep` auto snapshots; manual snapshots are never removed. */
export async function pruneAutoSnapshots(
  db: Queryable,
  documentName: string,
  keep: number
): Promise<number> {
  const result = await db.query(
    `DELETE FROM snapshots
     WHERE document_name = $1
       AND kind = 'auto'
       AND id NOT IN (
         SELECT id FROM snapshots
         WHERE document_name = $1 AND kind = 'auto'
         ORDER BY created_at DESC, id DESC
         LIMIT $2
       )`,
    [documentName, keep]
  )
  return result.rowCount ?? 0
}
