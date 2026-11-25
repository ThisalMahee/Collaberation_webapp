import { useCallback, useEffect, useState } from 'react'
import { createDocumentName, isValidDocumentName } from '@pad/shared'

const DOC_HASH_PREFIX = '#/doc/'

/** Extract a valid document name from a `#/doc/<name>` hash. */
export function parseDocumentHash(hash: string): string | null {
  if (!hash.startsWith(DOC_HASH_PREFIX)) return null
  const name = hash.slice(DOC_HASH_PREFIX.length)
  return isValidDocumentName(name) ? name : null
}

/** Build the hash for a document name. */
export function buildDocumentHash(name: string): string {
  return DOC_HASH_PREFIX + name
}

function nameFromLocation(): string | null {
  return parseDocumentHash(window.location.hash)
}

/** Read the active document name from the URL hash, creating one if absent. */
export function useDocumentName(): {
  name: string
  setName: (name: string) => void
} {
  const [name, setName] = useState<string>(() => {
    const fromHash = nameFromLocation()
    if (fromHash) return fromHash
    // A missing/invalid hash gets a fresh name without adding a history entry.
    const generated = createDocumentName()
    window.history.replaceState(null, '', buildDocumentHash(generated))
    return generated
  })

  useEffect(() => {
    const onHashChange = () => {
      const fromHash = nameFromLocation()
      if (fromHash) {
        setName(fromHash)
        return
      }
      const generated = createDocumentName()
      window.history.replaceState(null, '', buildDocumentHash(generated))
      setName(generated)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const setDocumentName = useCallback((next: string) => {
    const hash = buildDocumentHash(next)
    if (window.location.hash !== hash) window.location.hash = hash
    setName(next)
  }, [])

  return { name, setName: setDocumentName }
}
