import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createSharedDoc, getNotes } from '@pad/shared'

vi.mock('y-codemirror.next', () => ({ yCollab: () => [] }))

describe('NotesPanel', () => {
  it('shows a rendered preview of the shared Markdown text', async () => {
    const doc = createSharedDoc()
    getNotes(doc).insert(0, '# Shared heading')
    const { default: NotesPanel } = await import('./NotesPanel')
    render(<NotesPanel doc={doc} awareness={{} as never} />)
    expect(await screen.findByText('Shared heading')).toBeTruthy()
  })
})
