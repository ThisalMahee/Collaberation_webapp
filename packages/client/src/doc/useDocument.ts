import { useEffect, useMemo, useState } from 'react'
import type * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'
import { IndexeddbPersistence } from 'y-indexeddb'
import { createSharedDoc } from '@pad/shared'

export type DocumentStatus = 'connecting' | 'connected' | 'disconnected'

export interface DocumentHandle {
  doc: Y.Doc
  provider: HocuspocusProvider | null
  status: DocumentStatus
  synced: boolean
}

/** Route the socket through Vite's dev proxy; TLS pages use wss. */
function providerUrl(): string {
  const scheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${scheme}//${window.location.host}/hocuspocus`
}

/** Own the Y.Doc, its local IndexedDB cache and its Hocuspocus connection. */
export function useDocument(name: string): DocumentHandle {
  // One shared document per name (not per render), so switching pads cannot
  // leak the previous pad's content into the new one.
  const doc = useMemo(() => createSharedDoc(), [name])
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null)
  const [status, setStatus] = useState<DocumentStatus>('connecting')
  const [synced, setSynced] = useState(false)

  useEffect(() => {
    setStatus('connecting')
    setSynced(false)

    const persistence = new IndexeddbPersistence(name, doc)
    const connection = new HocuspocusProvider({
      url: providerUrl(),
      name,
      document: doc,
      onStatus: ({ status: next }) => setStatus(next as DocumentStatus),
      onSynced: ({ state }) => setSynced(state),
    })
    setProvider(connection)

    return () => {
      setProvider(null)
      connection.destroy()
      void persistence.destroy()
    }
  }, [doc, name])

  return { doc, provider, status, synced }
}
