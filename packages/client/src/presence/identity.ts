import type { RemoteCursor } from '@pad/shared'
import type { Awareness } from 'y-protocols/awareness'

const ADJECTIVES = [
  'brave', 'calm', 'clever', 'eager', 'jolly', 'kind', 'lively',
  'merry', 'noble', 'quick', 'quiet', 'sunny', 'witty', 'bold',
]

const ANIMALS = [
  'otter', 'panda', 'fox', 'koala', 'heron', 'badger', 'lynx',
  'whale', 'robin', 'mole', 'yak', 'crab', 'gecko', 'finch',
]

export interface LocalIdentity {
  name: string
  color: string
}

/** A random adjective/animal name and a stable, readable colour per client. */
export function createLocalIdentity(): LocalIdentity {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
  return {
    name: `${adjective} ${animal}`,
    color: hueToHex(Math.floor(Math.random() * 360)),
  }
}

/** Convert a hue (0-359) to a six-digit hex colour at fixed saturation/lightness. */
function hueToHex(hue: number): string {
  const saturation = 0.7
  const lightness = 0.5
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const secondary = chroma * (1 - Math.abs(((hue / 60) % 2) - 1))
  const match = lightness - chroma / 2

  let red = 0
  let green = 0
  let blue = 0
  if (hue < 60) {
    red = chroma
    green = secondary
  } else if (hue < 120) {
    red = secondary
    green = chroma
  } else if (hue < 180) {
    green = chroma
    blue = secondary
  } else if (hue < 240) {
    green = secondary
    blue = chroma
  } else if (hue < 300) {
    red = secondary
    blue = chroma
  } else {
    red = chroma
    blue = secondary
  }

  return `#${[red, green, blue]
    .map((component) => Math.round((component + match) * 255).toString(16).padStart(2, '0'))
    .join('')}`
}

/**
 * Awareness field names share one namespace, so producers must not collide:
 *   - `user`       — local identity (`{ name, color }`), set by App.
 *   - `cursor`     — reserved for yCollab, which writes Yjs relative positions
 *                    (`{ anchor, head }`) for remote text selections. Never
 *                    read or write it here: its shape is incompatible.
 *   - `flowCursor` — canvas pointer in flow coordinates (`{ x, y }`), written
 *                    by FlowCanvas on mousemove and read below.
 *
 * Derives renderable remote cursors from awareness, excluding the local client.
 */
export function cursorsFromAwareness(awareness: Awareness): RemoteCursor[] {
  const cursors: RemoteCursor[] = []
  awareness.getStates().forEach((state, clientId) => {
    if (clientId === awareness.clientID) return
    const user = state?.user
    const cursor = state?.flowCursor
    if (!user || !cursor) return
    if (typeof cursor.x !== 'number' || typeof cursor.y !== 'number') return

    cursors.push({
      clientId,
      name: typeof user.name === 'string' ? user.name : 'Guest',
      color: typeof user.color === 'string' ? user.color : '#6b7280',
      x: cursor.x,
      y: cursor.y,
    })
  })
  return cursors
}
