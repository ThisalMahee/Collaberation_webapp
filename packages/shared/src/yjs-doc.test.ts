import { describe, it, expect } from 'vitest'
import * as Y from 'yjs'
import {
  createSharedDoc, getNotes, getNodes, getOrCreateNode,
  encodeState, applyState, encodeDiff,
} from './yjs-doc'

describe('Yjs document helpers', () => {
  it('rebuilds a document from a full state update', () => {
    const a = createSharedDoc()
    const b = createSharedDoc()
    getNotes(a).insert(0, 'persist me')
    applyState(b, encodeState(a))
    expect(getNotes(b).toString()).toBe('persist me')
  })

  it('sends only the missing diff using a state vector', () => {
    const a = createSharedDoc()
    const b = createSharedDoc()
    getNotes(a).insert(0, 'base ')
    applyState(b, encodeState(a))
    getNotes(a).insert(5, 'extra')
    applyState(b, encodeDiff(a, Y.encodeStateVector(b)))
    expect(getNotes(b).toString()).toBe('base extra')
  })

  it('preserves concurrent edits to different fields of the same node', () => {
    const a = createSharedDoc()
    const b = createSharedDoc()
    const na = getOrCreateNode(a, 'n1')
    na.set('label', 'API'); na.set('x', 0); na.set('y', 0)
    applyState(b, encodeState(a))
    const nb = getNodes(b).get('n1')!
    nb.set('label', 'Gateway')  // concurrent rename
    na.set('x', 100)            // concurrent drag
    applyState(a, encodeState(b))
    const merged = getNodes(a).get('n1')!
    expect(merged.get('label')).toBe('Gateway')
    expect(merged.get('x')).toBe(100)
  })
})
