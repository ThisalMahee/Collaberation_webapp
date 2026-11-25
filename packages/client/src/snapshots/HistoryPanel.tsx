import { useCallback, useEffect, useState } from 'react'
import type { SnapshotMeta } from '@pad/shared'
import { deleteSnapshot, forkSnapshot, listSnapshots } from './api'

export interface HistoryPanelProps {
  documentName: string
  onFork: (name: string) => void
}

/** Short, human-readable age. Recomputed on render; no timer needed for a panel. */
function relativeTime(iso: string): string {
  const timestamp = new Date(iso).getTime()
  if (!Number.isFinite(timestamp)) return ''
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export function HistoryPanel({ documentName, onFork }: HistoryPanelProps) {
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // Bumped after every action so the effect below re-fetches. Fork also changes
  // `documentName`; the cancellation guard keeps the older request from winning.
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    setError(null)
    listSnapshots(documentName)
      .then((list) => {
        if (!cancelled) setSnapshots(list)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [documentName, reloadToken])

  const perform = useCallback(async (action: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      setReloadToken((token) => token + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }, [])

  const handleFork = (id: number) =>
    perform(async () => {
      const { name } = await forkSnapshot(documentName, id)
      onFork(name)
    })

  const handleDelete = (id: number) =>
    perform(() => deleteSnapshot(documentName, id))

  return (
    <aside className="history-panel" aria-label="Version history">
      <h2 className="history-title">Version history</h2>
      {error && (
        <p className="history-error" role="alert">
          {error}
        </p>
      )}
      {snapshots.length === 0 ? (
        <p className="history-empty">No versions yet — use “Save version” to create one.</p>
      ) : (
        <ul className="history-list">
          {snapshots.map((snapshot) => (
            <li className="history-row" key={snapshot.id}>
              <div className="history-row-main">
                <span className={`history-kind history-kind-${snapshot.kind}`}>
                  {snapshot.kind}
                </span>
                <span className="history-label">
                  {snapshot.label ?? 'Automatic checkpoint'}
                </span>
                <time
                  className="history-time"
                  dateTime={snapshot.createdAt}
                  title={snapshot.createdAt}
                >
                  {relativeTime(snapshot.createdAt)}
                </time>
              </div>
              <div className="history-actions">
                <button type="button" disabled={busy} onClick={() => void handleFork(snapshot.id)}>
                  Fork
                </button>
                {snapshot.kind === 'manual' && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleDelete(snapshot.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}

export default HistoryPanel
