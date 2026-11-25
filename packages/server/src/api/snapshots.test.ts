import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import request from 'supertest'
import type * as Y from 'yjs'
import {
  applyState,
  createSharedDoc,
  encodeState,
  getNotes,
  type SnapshotMeta,
} from '@pad/shared'
import { asQueryable, runMigrations, type Queryable } from '../db/pool'
import { loadState, saveState } from '../db/document-repository'
import { insertSnapshot } from '../db/snapshot-repository'
import { createApiApp } from './app'

let client: PGlite
let pool: Queryable
let app: ReturnType<typeof createApiApp>
const getDocumentByName = vi.fn<(name: string) => Y.Doc | undefined>()

beforeAll(async () => {
  client = new PGlite()
  await client.waitReady
  pool = asQueryable(client)
  await runMigrations(pool)
  app = createApiApp({ pool, getDocumentByName })
})

afterAll(async () => {
  await client.close()
})

beforeEach(() => {
  getDocumentByName.mockReset()
})

describe('snapshot REST API', () => {
  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })

  it('captures a manual snapshot and lists it', async () => {
    const doc = createSharedDoc()
    getNotes(doc).insert(0, 'checkpoint')
    getDocumentByName.mockReturnValue(doc)
    const res = await request(app)
      .post('/api/documents/test-doc-0001/snapshots')
      .send({ label: 'before refactor' })
    expect(res.status).toBe(201)
    expect(res.body.kind).toBe('manual')
    const list = await request(app).get('/api/documents/test-doc-0001/snapshots')
    expect(list.body.map((s: SnapshotMeta) => s.label)).toContain('before refactor')
  })

  it('does not change persisted document state when capturing a manual snapshot', async () => {
    // Seed the documents row with state A.
    const stored = createSharedDoc()
    getNotes(stored).insert(0, 'persisted state A')
    await saveState('keep-doc-0001', encodeState(stored), pool)

    // The live in-memory doc has since advanced to state B.
    const live = createSharedDoc()
    getNotes(live).insert(0, 'live state B')
    getDocumentByName.mockReturnValue(live)

    const res = await request(app)
      .post('/api/documents/keep-doc-0001/snapshots')
      .send({ label: 'checkpoint' })
    expect(res.status).toBe(201)

    // The snapshot captures B, but the persisted document must remain A.
    const got = await request(app).get(
      `/api/documents/keep-doc-0001/snapshots/${res.body.id}`
    )
    const snapDoc = createSharedDoc()
    applyState(snapDoc, Buffer.from(got.body.state, 'base64'))
    expect(getNotes(snapDoc).toString()).toBe('live state B')

    const after = createSharedDoc()
    applyState(after, (await loadState('keep-doc-0001', pool))!)
    expect(getNotes(after).toString()).toBe('persisted state A')
  })

  it('falls back to stored state when the live document is unavailable', async () => {
    const doc = createSharedDoc()
    getNotes(doc).insert(0, 'from storage')
    await saveState('fallback-doc-0001', encodeState(doc), pool)
    getDocumentByName.mockReturnValue(undefined)
    const res = await request(app)
      .post('/api/documents/fallback-doc-0001/snapshots')
      .send({})
    expect(res.status).toBe(201)
    const got = await request(app).get(
      `/api/documents/fallback-doc-0001/snapshots/${res.body.id}`
    )
    const restored = createSharedDoc()
    applyState(restored, Buffer.from(got.body.state, 'base64'))
    expect(getNotes(restored).toString()).toBe('from storage')
  })

  it('truncates labels to 120 characters', async () => {
    getDocumentByName.mockReturnValue(createSharedDoc())
    const res = await request(app)
      .post('/api/documents/trunc-doc-0001/snapshots')
      .send({ label: 'a'.repeat(200) })
    expect(res.status).toBe(201)
    expect(res.body.label).toBe('a'.repeat(120))
  })

  it('GET /:id returns meta plus base64 full state', async () => {
    const doc = createSharedDoc()
    getNotes(doc).insert(0, 'detail body')
    await saveState('detail-doc-0001', encodeState(doc), pool)
    const snap = await insertSnapshot(pool, {
      documentName: 'detail-doc-0001', kind: 'manual', label: 'detail', state: encodeState(doc),
    })
    const res = await request(app).get(
      `/api/documents/detail-doc-0001/snapshots/${snap.id}`
    )
    expect(res.status).toBe(200)
    expect(res.body.meta.id).toBe(snap.id)
    const restored = createSharedDoc()
    applyState(restored, Buffer.from(res.body.state, 'base64'))
    expect(getNotes(restored).toString()).toBe('detail body')
  })

  it('DELETE /:id returns 204, then 404', async () => {
    await saveState('del-doc-0001', encodeState(createSharedDoc()), pool)
    const snap = await insertSnapshot(pool, {
      documentName: 'del-doc-0001', kind: 'manual', label: null, state: encodeState(createSharedDoc()),
    })
    expect((await request(app).delete(
      `/api/documents/del-doc-0001/snapshots/${snap.id}`
    )).status).toBe(204)
    expect((await request(app).get(
      `/api/documents/del-doc-0001/snapshots/${snap.id}`
    )).status).toBe(404)
    expect((await request(app).delete(
      `/api/documents/del-doc-0001/snapshots/${snap.id}`
    )).status).toBe(404)
  })

  it('forks a snapshot into a new document without changing the original', async () => {
    const original = createSharedDoc()
    getNotes(original).insert(0, 'old version')
    // Persist the source document so the "original unchanged" assertion is meaningful.
    await saveState('snap-doc-0001', encodeState(original), pool)
    const snap = await insertSnapshot(pool, {
      documentName: 'snap-doc-0001', kind: 'manual', label: 'v1',
      state: encodeState(original),
    })
    const res = await request(app)
      .post(`/api/documents/snap-doc-0001/snapshots/${snap.id}/fork`)
    expect(res.status).toBe(201)
    const newName = res.body.name as string
    const newState = await loadState(newName, pool)
    const forkDoc = createSharedDoc()
    applyState(forkDoc, newState!)
    expect(getNotes(forkDoc).toString()).toBe('old version')
    const stillOriginal = createSharedDoc()
    applyState(stillOriginal, (await loadState('snap-doc-0001', pool))!)
    expect(getNotes(stillOriginal).toString()).not.toBe('new edits')
    expect(getNotes(stillOriginal).toString()).toBe('old version')
  })

  it('returns 404 when forking a missing snapshot', async () => {
    const res = await request(app)
      .post('/api/documents/snap-doc-0001/snapshots/999999/fork')
    expect(res.status).toBe(404)
  })

  it('returns 400 for invalid names and non-numeric ids', async () => {
    expect((await request(app).get('/api/documents/x/snapshots')).status).toBe(400)
    expect((await request(app).post('/api/documents/x/snapshots')).status).toBe(400)
    expect((await request(app).get(
      '/api/documents/test-doc-0001/snapshots/abc'
    )).status).toBe(400)
    expect((await request(app).post(
      '/api/documents/test-doc-0001/snapshots/abc/fork'
    )).status).toBe(400)
  })
})
