import { describe, it, expect, vi, beforeEach } from 'vitest'
import { forkSnapshot } from './api'

describe('snapshot API client', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()))
  it('posts to the fork endpoint and returns the new name', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(
      JSON.stringify({ name: 'newdoc0001' }),
      { status: 201, headers: { 'content-type': 'application/json' } },
    ))
    await expect(forkSnapshot('olddoc0001', 7)).resolves.toEqual({ name: 'newdoc0001' })
    expect(fetch).toHaveBeenCalledWith(
      '/api/documents/olddoc0001/snapshots/7/fork',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
