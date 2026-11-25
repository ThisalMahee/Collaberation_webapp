import { describe, it, expect } from 'vitest'
import { parseDocumentHash, buildDocumentHash } from './useDocumentName'

describe('document hash routing', () => {
  it('parses a valid hash', () => {
    expect(parseDocumentHash('#/doc/k7Qp_9xLm2')).toBe('k7Qp_9xLm2')
  })
  it('returns null for junk', () => {
    expect(parseDocumentHash('#/doc/short')).toBeNull()
    expect(parseDocumentHash('')).toBeNull()
  })
  it('round-trips a name', () => {
    expect(parseDocumentHash(buildDocumentHash('k7Qp_9xLm2'))).toBe('k7Qp_9xLm2')
  })
})
