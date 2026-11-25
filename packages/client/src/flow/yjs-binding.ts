import type { Edge, EdgeChange, Node, NodeChange } from '@xyflow/react'
import * as Y from 'yjs'
import { getEdges, getNodes, getOrCreateNode } from '@pad/shared'

type XY = { x: number; y: number }

/** Convert the shared node maps into React Flow's controlled node shape. */
export function nodesFromY(doc: Y.Doc): Node[] {
  const result: Node[] = []
  getNodes(doc).forEach((node, id) => {
    result.push({
      id,
      position: { x: Number(node.get('x') ?? 0), y: Number(node.get('y') ?? 0) },
      data: { label: String(node.get('label') ?? '') },
    })
  })
  return result
}

/** Convert the shared edge maps into React Flow's controlled edge shape. */
export function edgesFromY(doc: Y.Doc): Edge[] {
  const result: Edge[] = []
  getEdges(doc).forEach((edge, id) => {
    result.push({
      id,
      source: String(edge.get('source') ?? ''),
      target: String(edge.get('target') ?? ''),
    })
  })
  return result
}

/** Create (or update) a node in Yjs. A node's durable data is x, y and label. */
export function createNodeInY(doc: Y.Doc, id: string, position: XY, label: string): void {
  const node = getOrCreateNode(doc, id)
  doc.transact(() => {
    node.set('x', position.x)
    node.set('y', position.y)
    node.set('label', label)
  })
}

/** Create an edge in Yjs. */
export function createEdgeInY(doc: Y.Doc, id: string, source: string, target: string): void {
  const edge = new Y.Map<unknown>()
  edge.set('source', source)
  edge.set('target', target)
  getEdges(doc).set(id, edge)
}

/**
 * Mirror only the shared subset of node changes into Yjs: `position` and
 * `remove`. Everything React Flow owns locally (select, dimensions, add,
 * replace, …) is deliberately ignored so it never leaks into the document.
 */
export function applyNodeChangesToY(doc: Y.Doc, changes: NodeChange[]): void {
  const nodes = getNodes(doc)
  const edges = getEdges(doc)
  doc.transact(() => {
    for (const change of changes) {
      if (change.type === 'position' && change.position) {
        const node = nodes.get(change.id)
        if (!node) continue
        node.set('x', change.position.x)
        node.set('y', change.position.y)
      } else if (change.type === 'remove') {
        nodes.delete(change.id)
        // A removed node must not leave dangling incident edges behind.
        edges.forEach((edge, edgeId) => {
          if (edge.get('source') === change.id || edge.get('target') === change.id) {
            edges.delete(edgeId)
          }
        })
      }
    }
  })
}

/** Mirror only the shared subset of edge changes (`remove`) into Yjs. */
export function applyEdgeChangesToY(doc: Y.Doc, changes: EdgeChange[]): void {
  const edges = getEdges(doc)
  doc.transact(() => {
    for (const change of changes) {
      if (change.type === 'remove') {
        edges.delete(change.id)
      }
    }
  })
}
