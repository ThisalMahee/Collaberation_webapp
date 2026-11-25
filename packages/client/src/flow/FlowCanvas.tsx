import { useCallback, useEffect, useState, type MouseEvent as ReactMouseEvent } from 'react'
import * as Y from 'yjs'
import type { Awareness } from 'y-protocols/awareness'
import {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { PresenceLayer } from '../presence/PresenceLayer'
import {
  applyEdgeChangesToY,
  applyNodeChangesToY,
  createEdgeInY,
  createNodeInY,
} from './yjs-binding'
import { useYFlowSnapshot } from './useYFlowSnapshot'

export interface FlowCanvasProps {
  doc: Y.Doc
  awareness?: Awareness
}

export function FlowCanvas({ doc, awareness }: FlowCanvasProps) {
  // ReactFlow wraps its own children in a store provider; an explicit provider
  // here lets this component use the viewport helpers for cursor publishing.
  return (
    <ReactFlowProvider>
      <FlowCanvasContent doc={doc} awareness={awareness} />
    </ReactFlowProvider>
  )
}

function FlowCanvasContent({ doc, awareness }: FlowCanvasProps) {
  const { screenToFlowPosition } = useReactFlow()
  const snapshot = useYFlowSnapshot(doc)
  const [nodes, setNodes] = useState<Node[]>(snapshot.nodes)
  const [edges, setEdges] = useState<Edge[]>(snapshot.edges)

  // Pick up remote/shared changes. Preserve React-only fields (selection,
  // measured dimensions, dragging) that intentionally never reach Yjs.
  useEffect(() => {
    setNodes((current) => mergeNodes(snapshot.nodes, current))
  }, [snapshot.nodes])

  useEffect(() => {
    setEdges((current) => mergeEdges(snapshot.edges, current))
  }, [snapshot.edges])

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      applyNodeChangesToY(doc, changes)
      setNodes((current) => applyNodeChanges(changes, current))
    },
    [doc]
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      applyEdgeChangesToY(doc, changes)
      setEdges((current) => applyEdgeChanges(changes, current))
    },
    [doc]
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      createEdgeInY(doc, crypto.randomUUID(), connection.source, connection.target)
    },
    [doc]
  )

  // Minimal way to grow the diagram: a fresh node with a staggered default
  // position so repeated clicks do not stack nodes exactly on top of each other.
  const addNode = useCallback(() => {
    const offset = (snapshot.nodes.length % 6) * 36
    createNodeInY(doc, crypto.randomUUID(), { x: 120 + offset, y: 120 + offset }, 'New node')
  }, [doc, snapshot.nodes.length])

  // Presence is ephemeral: publish flow-space coordinates on awareness only.
  const onMouseMove = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (!awareness) return
      const { x, y } = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      awareness.setLocalStateField('flowCursor', { x, y })
    },
    [awareness, screenToFlowPosition]
  )

  return (
    <section className="flow-canvas" aria-label="Diagram canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onMouseMove={onMouseMove}
        fitView
      >
        <Panel position="top-left">
          <button type="button" onClick={addNode}>Add node</button>
        </Panel>
        <Background />
        <Controls />
        <MiniMap />
        <PresenceLayer awareness={awareness} />
      </ReactFlow>
    </section>
  )
}

export default FlowCanvas

/** Adopt shared nodes while keeping local-only visual state. */
function mergeNodes(shared: Node[], current: Node[]): Node[] {
  const byId = new Map(current.map((node) => [node.id, node]))
  return shared.map((node) => {
    const local = byId.get(node.id)
    if (!local) return node
    return {
      ...node,
      selected: local.selected,
      measured: local.measured,
      dragging: local.dragging,
    }
  })
}

/** Adopt shared edges while keeping local-only selection state. */
function mergeEdges(shared: Edge[], current: Edge[]): Edge[] {
  const byId = new Map(current.map((edge) => [edge.id, edge]))
  return shared.map((edge) => {
    const local = byId.get(edge.id)
    if (!local) return edge
    return { ...edge, selected: local.selected }
  })
}
