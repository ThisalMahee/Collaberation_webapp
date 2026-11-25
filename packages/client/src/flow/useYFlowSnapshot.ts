import { useCallback, useRef, useSyncExternalStore } from 'react'
import type { Edge, Node } from '@xyflow/react'
import * as Y from 'yjs'
import { getEdges, getNodes } from '@pad/shared'
import { edgesFromY, nodesFromY } from './yjs-binding'

export interface FlowSnapshot {
  nodes: Node[]
  edges: Edge[]
}

/**
 * Subscribe to both shared flow maps and expose a cached `{ nodes, edges }`
 * snapshot.
 *
 * `useSyncExternalStore` compares snapshots with `Object.is`, so `getSnapshot`
 * must return the **same object reference** until a Yjs change actually
 * happens. We bump a local revision counter inside `observeDeep` and only
 * rebuild the cached snapshot when that revision changes (or when the doc
 * changes). This is why we cannot use `useYValue` directly here: `read` would
 * build a fresh array on every call and spin React into an infinite loop.
 */
export function useYFlowSnapshot(doc: Y.Doc): FlowSnapshot {
  const nodes = getNodes(doc)
  const edges = getEdges(doc)

  const revision = useRef(0)
  const cache = useRef<{ doc: Y.Doc; revision: number; value: FlowSnapshot } | null>(null)

  const getSnapshot = useCallback((): FlowSnapshot => {
    const cached = cache.current
    if (!cached || cached.doc !== doc || cached.revision !== revision.current) {
      const value: FlowSnapshot = { nodes: nodesFromY(doc), edges: edgesFromY(doc) }
      cache.current = { doc, revision: revision.current, value }
      return value
    }
    return cached.value
  }, [doc])

  const subscribe = useCallback(
    (onChange: () => void) => {
      const handleChange = () => {
        revision.current += 1
        onChange()
      }
      nodes.observeDeep(handleChange)
      edges.observeDeep(handleChange)
      return () => {
        nodes.unobserveDeep(handleChange)
        edges.unobserveDeep(handleChange)
      }
    },
    [nodes, edges]
  )

  return useSyncExternalStore(subscribe, getSnapshot)
}
