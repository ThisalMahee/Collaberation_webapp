import type * as Y from 'yjs'
import { applyState, encodeState } from '@pad/shared'
import type { loadState, saveState } from '../db/document-repository'

/** The part of the Hocuspocus load hook payload we depend on. */
export interface LoadDocumentPayload {
  document: Y.Doc
  documentName: string
}

/** The part of the Hocuspocus store hook payload we depend on. */
export interface StoreDocumentPayload {
  document: Y.Doc
  documentName: string
}

/** Optional seam invoked after a document has been persisted (used for auto snapshots). */
export type OnAfterStore = (
  documentName: string,
  state: Uint8Array
) => void | Promise<void>

/**
 * Build an `onLoadDocument`-compatible hook that hydrates a document from the
 * stored full-state blob. A missing row leaves the document empty (fresh doc).
 */
export function createLoadDocumentHook(deps: { loadState: typeof loadState }) {
  return async (data: LoadDocumentPayload): Promise<Y.Doc> => {
    const state = await deps.loadState(data.documentName)
    if (state !== null) {
      applyState(data.document, state)
    }
    return data.document
  }
}

/**
 * Build an `onStoreDocument`-compatible hook that persists a full-state blob
 * and then awaits the optional `onAfterStore` callback with the same bytes.
 */
export function createStoreDocumentHook(deps: {
  saveState: typeof saveState
  onAfterStore?: OnAfterStore
}) {
  return async (data: StoreDocumentPayload): Promise<void> => {
    const state = encodeState(data.document)
    await deps.saveState(data.documentName, state)
    await deps.onAfterStore?.(data.documentName, state)
  }
}
