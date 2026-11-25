import { createHash } from 'node:crypto'
import type * as Y from 'yjs'
import { encodeState } from '@pad/shared'

export interface CapturedSnapshot {
  kind: 'manual' | 'auto'
  label: string | null
  state: Uint8Array
}

/** Capture a full Yjs state update for a document at this moment. */
export function captureSnapshot(
  doc: Y.Doc,
  kind: 'manual' | 'auto',
  label: string | null
): CapturedSnapshot {
  return { kind, label, state: encodeState(doc) }
}

/** Stable sha256 hex digest of a state blob, for change detection. */
export function stateHash(state: Uint8Array): string {
  return createHash('sha256').update(state).digest('hex')
}
