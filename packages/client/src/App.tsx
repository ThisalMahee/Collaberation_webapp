import { useEffect, useState } from 'react'
import { createDocumentName } from '@pad/shared'
import { useDocument } from './doc/useDocument'
import { useDocumentName } from './doc/useDocumentName'
import { FlowCanvas } from './flow/FlowCanvas'
import { NotesPanel } from './notes/NotesPanel'
import { createLocalIdentity } from './presence/identity'
import { createSnapshot } from './snapshots/api'
import { HistoryPanel } from './snapshots/HistoryPanel'
import './styles.css'

export default function App() {
  const { name, setName } = useDocumentName()
  const { doc, provider, status, synced } = useDocument(name)
  const label = status === 'connected' && synced ? 'synced' : status
  const [participants, setParticipants] = useState(0)
  const [showHistory, setShowHistory] = useState(false)
  const [historyKey, setHistoryKey] = useState(0)
  const [saveError, setSaveError] = useState<string | null>(null)

  // One identity per provider. `provider` is null on the first render, so this
  // effect also owns the subscription and its cleanup when the pad changes.
  useEffect(() => {
    if (!provider) {
      setParticipants(0)
      return
    }

    const awareness = provider.awareness
    if (!awareness) {
      setParticipants(0)
      return
    }

    awareness.setLocalStateField('user', createLocalIdentity())
    const syncCount = () => setParticipants(awareness.getStates().size)
    syncCount()
    awareness.on('change', syncCount)
    awareness.on('update', syncCount)
    return () => {
      awareness.off('change', syncCount)
      awareness.off('update', syncCount)
    }
  }, [provider])

  const handleSaveVersion = async () => {
    // A cancelled or blank prompt still saves: the label is genuinely optional.
    const raw = window.prompt('Label for this version (optional):')
    const snapshotLabel = raw && raw.trim() ? raw.trim() : null
    try {
      await createSnapshot(name, snapshotLabel)
      setSaveError(null)
      // Remount an open panel so it re-fetches the freshly created snapshot.
      setHistoryKey((key) => key + 1)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">Local-first Pad</span>
        <span className="doc-name" title={name}>{name}</span>
        <span className={`status-pill status-${status}`} role="status">
          {label} · {participants} online
        </span>
        <button type="button" onClick={() => void handleSaveVersion()}>
          Save version
        </button>
        <button
          type="button"
          aria-expanded={showHistory}
          onClick={() => setShowHistory((open) => !open)}
        >
          History {showHistory ? '▾' : '▸'}
        </button>
        <button type="button" onClick={() => setName(createDocumentName())}>
          New pad
        </button>
        {saveError && (
          <span className="action-error" role="alert" title={saveError}>
            {saveError}
          </span>
        )}
      </header>
      <main className={`workspace${showHistory ? ' with-history' : ''}`}>
        {/* provider is set in useDocument's effect; until then awareness is
            absent and yCollab simply omits remote selections (local editing
            still works). The editor re-binds once the provider connects. */}
        <NotesPanel doc={doc} awareness={provider?.awareness ?? undefined} />
        <FlowCanvas doc={doc} awareness={provider?.awareness ?? undefined} />
        {showHistory && (
          <HistoryPanel
            key={historyKey}
            documentName={name}
            onFork={(newName) => setName(newName)}
          />
        )}
      </main>
    </div>
  )
}
