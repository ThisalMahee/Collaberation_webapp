import { AUTO_SNAPSHOT_INTERVAL_MS, AUTO_SNAPSHOT_KEEP } from '@pad/shared'
import type { Queryable } from '../db/pool'
import type { insertSnapshot, pruneAutoSnapshots } from '../db/snapshot-repository'
import { stateHash } from './capture'

export interface AutoSnapshotPolicyInput {
  now: number
  lastAutoAt: number | null
  lastStateHash: string | null
  stateHash: string
  intervalMs: number
}

/**
 * Pure policy: a snapshot is due on the first store, or once both the interval
 * has elapsed and the state has changed since the last auto snapshot.
 */
export function shouldCreateAutoSnapshot(input: AutoSnapshotPolicyInput): boolean {
  const { now, lastAutoAt, lastStateHash, stateHash: hash, intervalMs } = input
  if (lastAutoAt === null) return true
  return now - lastAutoAt >= intervalMs && hash !== lastStateHash
}

interface TrackedSnapshot {
  lastAutoAt: number
  lastStateHash: string
}

export interface AutoSnapshotHandlerDeps {
  pool: Queryable
  insertSnapshot: typeof insertSnapshot
  pruneAutoSnapshots: typeof pruneAutoSnapshots
  intervalMs?: number
  keep?: number
}

/**
 * Build an `onAfterStore` callback that records automatic snapshots and keeps
 * only the newest `keep` of them. The task-4 store hook calls `saveState`
 * before this callback, so the parent `documents` row already exists.
 */
export function createAutoSnapshotHandler(deps: AutoSnapshotHandlerDeps) {
  const {
    pool,
    insertSnapshot: insert,
    pruneAutoSnapshots: prune,
    intervalMs = AUTO_SNAPSHOT_INTERVAL_MS,
    keep = AUTO_SNAPSHOT_KEEP,
  } = deps

  const lastByDocument = new Map<string, TrackedSnapshot>()

  return async (documentName: string, state: Uint8Array): Promise<void> => {
    const hash = stateHash(state)
    const now = Date.now()
    const previous = lastByDocument.get(documentName)

    if (shouldCreateAutoSnapshot({
      now,
      lastAutoAt: previous?.lastAutoAt ?? null,
      lastStateHash: previous?.lastStateHash ?? null,
      stateHash: hash,
      intervalMs,
    })) {
      await insert(pool, { documentName, kind: 'auto', label: null, state })
      lastByDocument.set(documentName, { lastAutoAt: now, lastStateHash: hash })
    }

    await prune(pool, documentName, keep)
  }
}
