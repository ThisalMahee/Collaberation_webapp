import { describe, it, expect } from 'vitest'
import { createDocumentName, isValidDocumentName } from './document-name'

describe('document names', () => {
  it('generates a name that passes its own validator', () => {
    const name = createDocumentName()
    expect(isValidDocumentName(name)).toBe(true)
  })
  it('rejects short, long, and punctuation-bearing names', () => {
    expect(isValidDocumentName('short')).toBe(false)
    expect(isValidDocumentName('a'.repeat(65))).toBe(false)
    expect(isValidDocumentName('has spaces')).toBe(false)
    expect(isValidDocumentName('k7Qp_9xLm2')).toBe(true)
  })
})
