import { describe, it, expect } from 'vitest'
import { shouldCreateAutoSnapshot } from './auto-policy'

const now = 1_000_000

describe('shouldCreateAutoSnapshot', () => {
  it('fires on the first store', () => {
    expect(shouldCreateAutoSnapshot({
      now, lastAutoAt: null, lastStateHash: null, stateHash: 'abc',
      intervalMs: 300_000,
    })).toBe(true)
  })
  it('suppresses a snapshot inside the interval', () => {
    expect(shouldCreateAutoSnapshot({
      now, lastAutoAt: now - 60_000, lastStateHash: 'old', stateHash: 'abc',
      intervalMs: 300_000,
    })).toBe(false)
  })
  it('suppresses a snapshot when the state has not changed', () => {
    expect(shouldCreateAutoSnapshot({
      now, lastAutoAt: now - 600_000, lastStateHash: 'abc', stateHash: 'abc',
      intervalMs: 300_000,
    })).toBe(false)
  })
  it('fires when the interval has passed and the state changed', () => {
    expect(shouldCreateAutoSnapshot({
      now, lastAutoAt: now - 600_000, lastStateHash: 'old', stateHash: 'abc',
      intervalMs: 300_000,
    })).toBe(true)
  })
})
