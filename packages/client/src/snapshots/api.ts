import type { SnapshotMeta } from '@pad/shared'

/**
 * Small wrapper around the snapshot REST API. All routes are reached through
 * Vite's `/api` dev proxy so the browser only ever talks to its own origin.
 */
async function request<T>(path: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!response.ok) {
    // Surface the server's message (or the bare status if it sent no body).
    const detail = await response.text()
    throw new Error(detail || `Request failed with status ${response.status}`)
  }

  // DELETE replies with 204 No Content; there is no JSON to parse there.
  if (response.status === 204) return undefined as T
  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export function listSnapshots(documentName: string): Promise<SnapshotMeta[]> {
  return request<SnapshotMeta[]>(`/documents/${documentName}/snapshots`, 'GET')
}

export function createSnapshot(
  documentName: string,
  label: string | null
): Promise<SnapshotMeta> {
  return request<SnapshotMeta>(`/documents/${documentName}/snapshots`, 'POST', { label })
}

export function forkSnapshot(
  documentName: string,
  id: number
): Promise<{ name: string }> {
  return request<{ name: string }>(`/documents/${documentName}/snapshots/${id}/fork`, 'POST')
}

export function deleteSnapshot(documentName: string, id: number): Promise<void> {
  return request<void>(`/documents/${documentName}/snapshots/${id}`, 'DELETE')
}
