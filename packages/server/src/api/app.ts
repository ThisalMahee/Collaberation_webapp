import express, { type Express } from 'express'
import type * as Y from 'yjs'
import type { Queryable } from '../db/pool'
import { asyncHandler, createSnapshotsRouter } from './snapshots'

/** Build the Express app for the snapshot REST API. */
export function createApiApp(deps: {
  pool: Queryable
  getDocumentByName: (name: string) => Y.Doc | undefined
}): Express {
  const app = express()

  app.use(express.json())

  app.get(
    '/api/health',
    asyncHandler(async (_req, res) => {
      return res.status(200).json({ ok: true })
    })
  )

  app.use('/api', createSnapshotsRouter(deps))

  return app
}
