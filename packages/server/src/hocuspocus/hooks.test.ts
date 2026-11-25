import { describe, it, expect, vi } from 'vitest'
import { createSharedDoc, getNotes, encodeState } from '@pad/shared'
import { createLoadDocumentHook, createStoreDocumentHook } from './hooks'

describe('Hocuspocus hooks', () => {
  it('loads a stored blob into the document', async () => {
    const stored = createSharedDoc()
    getNotes(stored).insert(0, 'from postgres')
    const loadState = vi.fn().mockResolvedValue(encodeState(stored))
    const hook = createLoadDocumentHook({ loadState })
    const target = createSharedDoc()
    const result = await hook({ document: target, documentName: 'doc1' })
    expect(result).toBe(target)
    expect(getNotes(target).toString()).toBe('from postgres')
  })

  it('stores the full state and calls the after-store hook', async () => {
    const saveState = vi.fn().mockResolvedValue(undefined)
    const onAfterStore = vi.fn()
    const hook = createStoreDocumentHook({ saveState, onAfterStore })
    const doc = createSharedDoc()
    getNotes(doc).insert(0, 'save me')
    await hook({ document: doc, documentName: 'doc1' })
    expect(saveState).toHaveBeenCalledWith('doc1', expect.any(Uint8Array))
    expect(onAfterStore).toHaveBeenCalledWith('doc1', expect.any(Uint8Array))
  })
})
