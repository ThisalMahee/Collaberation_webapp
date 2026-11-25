import { describe, it, expect } from 'vitest'
import type { Awareness } from 'y-protocols/awareness'
import { createLocalIdentity, cursorsFromAwareness } from './identity'

describe('createLocalIdentity', () => {
  it('returns a readable name and a valid hex colour', () => {
    const id = createLocalIdentity()
    expect(id.name.split(' ')).toHaveLength(2)
    expect(id.color).toMatch(/^#[0-9a-f]{6}$/i)
  })
})

describe('cursorsFromAwareness', () => {
  it('reads flowCursor for the canvas cursor and leaves yCollab cursor untouched', () => {
    const localClientId = 1
    const remoteClientId = 2
    // yCollab's selection shape: Yjs relative positions for anchor/head, with
    // no x/y. This is what the notes editor writes into the `cursor` field.
    const selection = {
      anchor: { type: 'notes', item: null, assoc: 0 },
      head: { type: 'notes', item: null, assoc: 0 },
    }
    const states = new Map<number, Record<string, unknown>>([
      [
        localClientId,
        { user: { name: 'Local', color: '#111111' }, flowCursor: { x: 1, y: 2 } },
      ],
      [
        remoteClientId,
        {
          user: { name: 'Remote Fox', color: '#abcdef' },
          flowCursor: { x: 42, y: 99 },
          cursor: selection,
        },
      ],
    ])
    const awareness = {
      clientID: localClientId,
      getStates: () => states,
    } as unknown as Awareness

    const cursors = cursorsFromAwareness(awareness)

    // The local client is excluded; the remote client contributes its canvas
    // cursor from flowCursor, not its { anchor, head } text selection.
    expect(cursors).toEqual([
      {
        clientId: remoteClientId,
        name: 'Remote Fox',
        color: '#abcdef',
        x: 42,
        y: 99,
      },
    ])
    // The reserved yCollab field is still intact and in its original shape.
    expect(states.get(remoteClientId)?.cursor).toEqual(selection)
  })
})
