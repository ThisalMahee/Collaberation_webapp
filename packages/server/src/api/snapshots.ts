import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express'
import * as Y from 'yjs'
import {
  applyState,
  createDocumentName,
  isValidDocumentName,
} from '@pad/shared'
import type { Queryable } from '../db/pool'
import { createDocumentFromState, ensureDocumentRow, loadState } from '../db/document-repository'
import {
  deleteSnapshot,
  getSnapshot,
  insertSnapshot,
  listSnapshots,
} from '../db/snapshot-repository'
import { captureSnapshot } from '../snapshots/capture'

export interface SnapshotRouterDeps {
  pool: Queryable
  getDocumentByName: (name: string) => Y.Doc | undefined
}

/** Forward a rejected handler promise to Express's error middleware (→ 500). */
export const asyncHandler =
  (
    handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
  ): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }

/** Read a single route param as a string (Express 5 types these as string | string[]). */
function param(req: Request, key: string): string | null {
  const value = req.params[key]
  return typeof value === 'string' ? value : null
}

/** Parse a numeric route id, returning `null` for anything invalid. */
function parseId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null
  const id = Number(raw)
  return Number.isSafeInteger(id) ? id : null
}

const INVALID_NAME = { error: 'invalid document name' }
const INVALID_ID = { error: 'invalid snapshot id' }
const NOT_FOUND = { error: 'snapshot not found' }

/** Build the snapshot router. `pool` is passed explicitly to every repository call. */
export function createSnapshotsRouter(deps: SnapshotRouterDeps): Router {
  const { pool, getDocumentByName } = deps
  const router = Router()

  // GET /api/documents/:name/snapshots — metadata only, no blobs.
  router.get(
    '/documents/:name/snapshots',
    asyncHandler(async (req, res) => {
      const name = param(req, 'name')
      if (name === null || !isValidDocumentName(name)) return res.status(400).json(INVALID_NAME)
      return res.status(200).json(await listSnapshots(pool, name))
    })
  )

  // POST /api/documents/:name/snapshots — capture a manual snapshot.
  router.post(
    '/documents/:name/snapshots',
    asyncHandler(async (req, res) => {
      const name = param(req, 'name')
      if (name === null || !isValidDocumentName(name)) return res.status(400).json(INVALID_NAME)

      const rawLabel: unknown = req.body?.label
      const label = typeof rawLabel === 'string' ? rawLabel.slice(0, 120) : null

      // Prefer the live Hocuspocus document; otherwise fall back to the
      // persisted state in a fresh Y.Doc.
      let doc = getDocumentByName(name)
      if (!doc) {
        const state = await loadState(name, pool)
        doc = new Y.Doc()
        if (state) applyState(doc, state)
      }

      const captured = captureSnapshot(doc, 'manual', label)
      // `snapshots.document_name` references `documents(name)`, so make sure a
      // parent row exists (e.g. a live doc not yet stored by the debounced
      // Hocuspocus hook). DO NOTHING on conflict: a persisted state may already
      // be newer than this frozen capture, and must never be clobbered by it.
      await ensureDocumentRow(name, captured.state, pool)
      const meta = await insertSnapshot(pool, { documentName: name, ...captured })
      return res.status(201).json(meta)
    })
  )

  // GET /api/documents/:name/snapshots/:id — metadata + base64 full state.
  router.get(
    '/documents/:name/snapshots/:id',
    asyncHandler(async (req, res) => {
      const name = param(req, 'name')
      if (name === null || !isValidDocumentName(name)) return res.status(400).json(INVALID_NAME)
      const rawId = param(req, 'id')
      const id = rawId === null ? null : parseId(rawId)
      if (id === null) return res.status(400).json(INVALID_ID)

      const snapshot = await getSnapshot(pool, name, id)
      if (!snapshot) return res.status(404).json(NOT_FOUND)
      return res.status(200).json({
        meta: snapshot.meta,
        state: Buffer.from(snapshot.state).toString('base64'),
      })
    })
  )

  // DELETE /api/documents/:name/snapshots/:id
  router.delete(
    '/documents/:name/snapshots/:id',
    asyncHandler(async (req, res) => {
      const name = param(req, 'name')
      if (name === null || !isValidDocumentName(name)) return res.status(400).json(INVALID_NAME)
      const rawId = param(req, 'id')
      const id = rawId === null ? null : parseId(rawId)
      if (id === null) return res.status(400).json(INVALID_ID)

      const deleted = await deleteSnapshot(pool, name, id)
      if (!deleted) return res.status(404).json(NOT_FOUND)
      return res.status(204).end()
    })
  )

  // POST /api/documents/:name/snapshots/:id/fork — seed a new document from a
  // snapshot, leaving the source document untouched.
  router.post(
    '/documents/:name/snapshots/:id/fork',
    asyncHandler(async (req, res) => {
      const name = param(req, 'name')
      if (name === null || !isValidDocumentName(name)) return res.status(400).json(INVALID_NAME)
      const rawId = param(req, 'id')
      const id = rawId === null ? null : parseId(rawId)
      if (id === null) return res.status(400).json(INVALID_ID)

      const snapshot = await getSnapshot(pool, name, id)
      if (!snapshot) return res.status(404).json(NOT_FOUND)

      const newName = createDocumentName()
      await createDocumentFromState(newName, snapshot.state, pool)
      return res.status(201).json({ name: newName })
    })
  )

  return router
}
