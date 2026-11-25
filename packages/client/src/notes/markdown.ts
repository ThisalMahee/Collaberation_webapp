/**
 * Compact, single-line plain-text preview of a Markdown source string.
 * Used by the status area; the full rendered preview lives in NotesPanel.
 */
export function markdownToPreview(source: string): string {
  return source
    .replace(/```[\s\S]*?```/g, ' ') // fenced code blocks
    .replace(/`[^`]*`/g, ' ') // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links -> label
    .replace(/(\*\*|__|~~)(.*?)\1/g, '$2') // strong / strikethrough
    .replace(/(\*|_)(.*?)\1/g, '$2') // emphasis
    .replace(/^\s{0,3}#{1,6}\s+/gm, '') // ATX headings
    .replace(/^\s*[-*+]\s+/gm, '') // bullet markers
    .replace(/\s+/g, ' ')
    .trim()
}
