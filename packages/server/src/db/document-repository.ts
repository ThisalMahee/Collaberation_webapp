import { getDefaultQueryable, type Queryable } from './pool'

/** Read a document's full Yjs state blob, or null if the document does not exist. */
export async function loadState(
  name: string,
  db: Queryable = getDefaultQueryable()
): Promise<Uint8Array | null> {
  const { rows } = await db.query<{ state: Uint8Array }>(
    'SELECT state FROM documents WHERE name = $1',
    [name]
  )
  if (rows.length === 0) return null
  return new Uint8Array(rows[0]!.state)
}

/** Insert or update a document's full Yjs state blob. */
export async function saveState(
  name: string,
  state: Uint8Array,
  db: Queryable = getDefaultQueryable()
): Promise<void> {
  await db.query(
    'INSERT INTO documents (name, state) VALUES ($1,$2) ON CONFLICT (name) DO UPDATE SET state = EXCLUDED.state, updated_at = now()',
    [name, state]
  )
}

/**
 * Ensure a `documents` parent row exists for a snapshot's foreign key without
 * overwriting an existing state. The given bytes are used only when no row
 * exists yet; callers must not use this to persist newer live state.
 */
export async function ensureDocumentRow(
  name: string,
  state: Uint8Array,
  db: Queryable = getDefaultQueryable()
): Promise<void> {
  await db.query(
    'INSERT INTO documents (name, state) VALUES ($1,$2) ON CONFLICT (name) DO NOTHING',
    [name, state]
  )
}

/** Create a brand-new document from a state blob (caller guarantees a fresh name). */
export async function createDocumentFromState(
  name: string,
  state: Uint8Array,
  db: Queryable = getDefaultQueryable()
): Promise<void> {
  await db.query(
    'INSERT INTO documents (name, state) VALUES ($1,$2)',
    [name, state]
  )
}
