import type * as Y from 'yjs'
import { Hocuspocus, type Configuration } from '@hocuspocus/server'
import { HOCUSPOCUS_DEBOUNCE_MS } from '@pad/shared'
import type { Config } from '../config'

export interface HocuspocusHooks {
  onLoadDocument: Function
  onStoreDocument: Function
}

export interface RunningHocuspocus {
  server: Hocuspocus
  getDocumentByName: (name: string) => Y.Doc | undefined
}

/** Configure and start the Hocuspocus WebSocket server for Yjs sync. */
export async function startHocuspocus(
  config: Config,
  hooks: HocuspocusHooks
): Promise<RunningHocuspocus> {
  const server = new Hocuspocus().configure({
    port: config.portHocuspocus,
    debounce: HOCUSPOCUS_DEBOUNCE_MS,
    onLoadDocument: hooks.onLoadDocument as Configuration['onLoadDocument'],
    onStoreDocument: hooks.onStoreDocument as Configuration['onStoreDocument'],
  })

  await server.listen()

  // Hocuspocus keeps the live documents in a registry keyed by name. Each value
  // is a Hocuspocus `Document`, which extends `Y.Doc`, so this returns the exact
  // instance clients are editing rather than a stale copy.
  const getDocumentByName = (name: string): Y.Doc | undefined =>
    server.documents.get(name)

  return { server, getDocumentByName }
}
