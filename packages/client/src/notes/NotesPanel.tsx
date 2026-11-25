import { useEffect, useRef } from 'react'
import * as Y from 'yjs'
import type { Awareness } from 'y-protocols/awareness'
import { EditorView } from '@codemirror/view'
import { markdown } from '@codemirror/lang-markdown'
import { yCollab } from 'y-codemirror.next'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getNotes } from '@pad/shared'
import { useYValue } from '../doc/useYValue'
import { markdownToPreview } from './markdown'

export interface NotesPanelProps {
  doc: Y.Doc
  awareness?: Awareness
}

export function NotesPanel({ doc, awareness }: NotesPanelProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  // Subscribe to the Y.Text (useYValue observes its target with observeDeep,
  // which a Y.Doc does not expose). `read` stays a primitive string so
  // useSyncExternalStore's Object.is comparison is stable. React never writes.
  const text = useYValue(getNotes(doc), () => getNotes(doc).toString())

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    // Awareness is absent until useDocument's effect connects the provider.
    // Local editing works without it; skip yCollab binding until it arrives.
    if (!awareness) return

    const ytext = getNotes(doc)
    const undoManager = new Y.UndoManager(ytext)
    const view = new EditorView({
      parent: host,
      extensions: [
        markdown(),
        yCollab(ytext, awareness, { undoManager }),
        EditorView.theme({
          '&': { height: '100%', fontSize: '14px' },
          '.cm-scroller': {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          },
          '.cm-content': { padding: '8px 0' },
        }),
      ],
    })

    return () => {
      view.destroy()
      undoManager.destroy()
    }
  }, [doc, awareness])

  return (
    <section className="notes-panel">
      <div className="notes-editor" ref={hostRef} />
      <div className="notes-preview">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      </div>
      <div className="notes-status" title={markdownToPreview(text)}>
        Preview: {markdownToPreview(text)}
      </div>
    </section>
  )
}

export default NotesPanel
