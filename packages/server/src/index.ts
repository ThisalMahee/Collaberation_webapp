import { createApiApp } from './api/app'
import { loadConfig } from './config'
import { asQueryable, createPool, runMigrations } from './db/pool'
import { loadState, saveState } from './db/document-repository'
import {
  createLoadDocumentHook,
  createStoreDocumentHook,
} from './hocuspocus/hooks'
import { startHocuspocus } from './hocuspocus/server'
import { createAutoSnapshotHandler } from './snapshots/auto-policy'
import { insertSnapshot, pruneAutoSnapshots } from './db/snapshot-repository'

async function main(): Promise<void> {
  const config = loadConfig()

  const pool = createPool(config.databaseUrl)
  const db = asQueryable(pool)
  await runMigrations(db)

  const onLoadDocument = createLoadDocumentHook({
    loadState: (name) => loadState(name, db),
  })
  // The auto-snapshot tracker lives in memory and resets on restart. That is
  // safe: the first store after a restart simply creates a fresh auto snapshot.
  const onAfterStore = createAutoSnapshotHandler({
    pool: db,
    insertSnapshot,
    pruneAutoSnapshots,
  })
  const onStoreDocument = createStoreDocumentHook({
    saveState: (name, state) => saveState(name, state, db),
    onAfterStore,
  })

  const { getDocumentByName } = await startHocuspocus(config, {
    onLoadDocument,
    onStoreDocument,
  })
  console.log(`Hocuspocus listening on port ${config.portHocuspocus}`)

  const app = createApiApp({ pool: db, getDocumentByName })
  app.listen(config.portApi, () => {
    console.log(`Snapshot REST API listening on port ${config.portApi}`)
  })
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
