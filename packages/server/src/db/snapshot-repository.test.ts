import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { asQueryable, runMigrations, type Queryable } from './pool'
import { saveState } from './document-repository'
import { createSharedDoc, getNotes, encodeState } from '@pad/shared'
import {
  insertSnapshot,
  listSnapshots,
  getSnapshot,
  deleteSnapshot,
  pruneAutoSnapshots,
} from './snapshot-repository'

let client: PGlite
let db: Queryable

beforeAll(async () => {
  client = new PGlite()
  await client.waitReady
  db = asQueryable(client)
  await runMigrations(db)
})
afterAll(async () => {
  await client.close()
})

describe('snapshot repository', () => {
  it('inserts, lists, and prunes auto snapshots, keeping manual ones', async () => {
    const state = encodeState(createSharedDoc())
    await saveState('snap-doc-0001', state, db)
    for (let i = 0; i < 5; i++) await insertSnapshot(db, {
      documentName: 'snap-doc-0001', kind: 'auto', label: null, state,
    })
    await insertSnapshot(db, {
      documentName: 'snap-doc-0001', kind: 'manual', label: 'keep me', state,
    })
    const removed = await pruneAutoSnapshots(db, 'snap-doc-0001', 2)
    expect(removed).toBe(3)
    const list = await listSnapshots(db, 'snap-doc-0001')
    expect(list).toHaveLength(3)
    expect(list.some(s => s.kind === 'manual' && s.label === 'keep me')).toBe(true)
  })

  it('gets and deletes a snapshot by document name and id', async () => {
    const doc = createSharedDoc()
    getNotes(doc).insert(0, 'snapshot body')
    const state = encodeState(doc)
    await saveState('snap-doc-0002', state, db)
    const inserted = await insertSnapshot(db, {
      documentName: 'snap-doc-0002', kind: 'manual', label: 'target', state,
    })

    const fetched = await getSnapshot(db, 'snap-doc-0002', inserted.id)
    expect(fetched).not.toBeNull()
    expect(fetched!.meta).toEqual(inserted)
    expect(new Uint8Array(fetched!.state)).toEqual(state)
    expect(await getSnapshot(db, 'snap-doc-0002', 999999)).toBeNull()

    expect(await deleteSnapshot(db, 'snap-doc-0002', inserted.id)).toBe(true)
    expect(await deleteSnapshot(db, 'snap-doc-0002', inserted.id)).toBe(false)
    expect(await getSnapshot(db, 'snap-doc-0002', inserted.id)).toBeNull()
  })
})
