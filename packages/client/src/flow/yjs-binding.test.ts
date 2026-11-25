import { describe, it, expect } from 'vitest'
import { createSharedDoc, getNodes, getNotes, encodeState, applyState } from '@pad/shared'
import { nodesFromY, createNodeInY, applyNodeChangesToY } from './yjs-binding'

describe('React Flow ⇄ Yjs binding', () => {
  it('round-trips a created node', () => {
    const doc = createSharedDoc()
    createNodeInY(doc, 'n1', { x: 10, y: 20 }, 'API')
    expect(nodesFromY(doc)).toMatchObject([
      { id: 'n1', position: { x: 10, y: 20 }, data: { label: 'API' } },
    ])
  })

  it('shares position and removal but not selection', () => {
    const a = createSharedDoc()
    const b = createSharedDoc()
    createNodeInY(a, 'n1', { x: 0, y: 0 }, 'API')
    applyState(b, encodeState(a))
    applyNodeChangesToY(a, [
      { id: 'n1', type: 'position', position: { x: 50, y: 60 }, dragging: false },
      { id: 'n1', type: 'select', selected: true },
    ])
    applyState(b, encodeState(a))
    expect(nodesFromY(b)[0].position).toEqual({ x: 50, y: 60 })
    expect((getNodes(b).get('n1') as any).has('selected')).toBe(false)
  })
})
