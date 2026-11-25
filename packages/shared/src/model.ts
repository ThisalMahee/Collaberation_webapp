/** A durable, named checkpoint as returned by the snapshot REST API. */
export interface SnapshotMeta {
  id: number
  documentName: string
  kind: 'manual' | 'auto'
  label: string | null
  /** ISO 8601 UTC timestamp. */
  createdAt: string
}

/** Plain-object shape of a flowchart node: position and label live in its own Y.Map. */
export interface FlowNodeSnapshot {
  id: string
  x: number
  y: number
  label: string
}

/** Plain-object shape of a flowchart edge. */
export interface FlowEdgeSnapshot {
  id: string
  source: string
  target: string
}

/** A remote participant's cursor, derived from awareness state for canvas rendering. */
export interface RemoteCursor {
  clientId: number
  name: string
  color: string
  x: number
  y: number
}

export const AUTO_SNAPSHOT_INTERVAL_MS = 300000
export const AUTO_SNAPSHOT_KEEP = 20
export const HOCUSPOCUS_DEBOUNCE_MS = 1000
