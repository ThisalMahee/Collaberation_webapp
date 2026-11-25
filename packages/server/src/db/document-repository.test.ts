import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { asQueryable, runMigrations, type Queryable } from './pool'
import { ensureDocumentRow, loadState, saveState } from './document-repository'
import { createSharedDoc, getNotes, encodeState, applyState } from '@pad/shared'

let client: PGlite
let db: Queryable

beforeAll(async () => {
  client = new PGlite()
  await client.waitReady
  db = asQueryable(client)
  await runMigrations(db)
})
afterAll(async () => { await client.close() })

describe('document repository', () => {
  it('round-trips a full state blob through BYTEA', async () => {
    const doc = createSharedDoc()
    getNotes(doc).insert(0, 'persist me')
    const blob = encodeState(doc)
    await saveState('test-doc-0001', blob, db)
    const loaded = await loadState('test-doc-0001', db)
    expect(loaded).not.toBeNull()
    expect(new Uint8Array(loaded!)).toEqual(blob)
    const restored = createSharedDoc()
    applyState(restored, loaded!)
    expect(getNotes(restored).toString()).toBe('persist me')
  })

  it('returns null for an unknown document', async () => {
    expect(await loadState('does-not-exist', db)).toBeNull()
  })

  it('ensureDocumentRow never overwrites an existing state', async () => {
    const first = createSharedDoc()
    getNotes(first).insert(0, 'first version')
    const firstState = encodeState(first)
    await ensureDocumentRow('ensure-doc-0001', firstState, db)

    const second = createSharedDoc()
    getNotes(second).insert(0, 'second version')
    await ensureDocumentRow('ensure-doc-0001', encodeState(second), db)

    const stored = await loadState('ensure-doc-0001', db)
    expect(stored).not.toBeNull()
    expect(new Uint8Array(stored!)).toEqual(firstState)
    const restored = createSharedDoc()
    applyState(restored, stored!)
    expect(getNotes(restored).toString()).toBe('first version')
  })
})
