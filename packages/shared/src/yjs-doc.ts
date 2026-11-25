import * as Y from 'yjs'

export function createSharedDoc(): Y.Doc {
  const doc = new Y.Doc()
  // Ensure the maps exist on the shared doc.
  getNodes(doc)
  getEdges(doc)
  return doc
}

export function getNotes(doc: Y.Doc): Y.Text {
  return doc.getText('notes')
}

export function getNodes(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
  return doc.getMap<Y.Map<unknown>>('nodes')
}

export function getEdges(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
  return doc.getMap<Y.Map<unknown>>('edges')
}

export function getOrCreateNode(doc: Y.Doc, id: string): Y.Map<unknown> {
  const nodes = getNodes(doc)
  let node = nodes.get(id)
  if (!node) {
    node = new Y.Map<unknown>()
    nodes.set(id, node)
  }
  return node
}

export function encodeState(doc: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(doc)
}

export function applyState(doc: Y.Doc, state: Uint8Array): void {
  Y.applyUpdate(doc, state)
}

export function encodeDiff(doc: Y.Doc, remoteVector: Uint8Array): Uint8Array {
  return Y.encodeStateAsUpdate(doc, remoteVector)
}
