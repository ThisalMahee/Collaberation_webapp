import { describe, it, expect } from 'vitest'
import { createSharedDoc, getNotes, applyState, encodeState } from '@pad/shared'
import { captureSnapshot, stateHash } from './capture'

describe('captureSnapshot', () => {
  it('captures a full state that restores into a fresh doc', () => {
    const doc = createSharedDoc()
    getNotes(doc).insert(0, 'version one')
    const snap = captureSnapshot(doc, 'manual', 'first')
    expect(snap.kind).toBe('manual')
    expect(snap.label).toBe('first')
    const restored = createSharedDoc()
    applyState(restored, snap.state)
    expect(getNotes(restored).toString()).toBe('version one')

    const hex = stateHash(snap.state)
    expect(hex).toMatch(/^[0-9a-f]{64}$/)
    expect(stateHash(new Uint8Array(snap.state))).toBe(hex)
    const other = createSharedDoc()
    getNotes(other).insert(0, 'a different version')
    expect(stateHash(encodeState(other))).not.toBe(hex)
  })
})
