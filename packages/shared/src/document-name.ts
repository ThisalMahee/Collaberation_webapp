export const DOC_NAME_PATTERN = /^[a-zA-Z0-9_-]{8,64}$/

export function isValidDocumentName(name: string): boolean {
  return DOC_NAME_PATTERN.test(name)
}

export function createDocumentName(): string {
  return crypto.randomUUID().replace(/-/g, '')
}
