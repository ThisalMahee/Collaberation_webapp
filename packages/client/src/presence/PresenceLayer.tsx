import { useEffect, useState } from 'react'
import { ViewportPortal } from '@xyflow/react'
import type { RemoteCursor } from '@pad/shared'
import type { Awareness } from 'y-protocols/awareness'
import { cursorsFromAwareness } from './identity'

export interface PresenceLayerProps {
  awareness?: Awareness
}

/**
 * Render remote pointers in flow coordinates. ViewportPortal places them inside
 * ReactFlow's transformed viewport, so panning and zooming need no extra math.
 */
export function PresenceLayer({ awareness }: PresenceLayerProps) {
  const [cursors, setCursors] = useState<RemoteCursor[]>(() =>
    awareness ? cursorsFromAwareness(awareness) : []
  )

  useEffect(() => {
    if (!awareness) {
      setCursors([])
      return
    }

    const sync = () => setCursors(cursorsFromAwareness(awareness))
    sync()
    awareness.on('change', sync)
    awareness.on('update', sync)
    return () => {
      awareness.off('change', sync)
      awareness.off('update', sync)
    }
  }, [awareness])

  if (!awareness || cursors.length === 0) return null

  return (
    <ViewportPortal>
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {cursors.map((cursor) => (
          <div
            key={cursor.clientId}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              transform: `translate(${cursor.x}px, ${cursor.y}px)`,
              pointerEvents: 'none',
              willChange: 'transform',
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              style={{ display: 'block', fill: cursor.color, stroke: '#fff', strokeWidth: 1.5 }}
            >
              <path d="M2 1 L2 15 L6.1 11.1 L9 17 L11.8 15.6 L8.9 9.9 L15.2 9.9 Z" />
            </svg>
            <span
              style={{
                display: 'inline-block',
                marginLeft: 12,
                marginTop: -2,
                padding: '2px 6px',
                borderRadius: 4,
                background: cursor.color,
                color: '#fff',
                font: '600 11px system-ui, sans-serif',
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
              }}
            >
              {cursor.name}
            </span>
          </div>
        ))}
      </div>
    </ViewportPortal>
  )
}

export default PresenceLayer
