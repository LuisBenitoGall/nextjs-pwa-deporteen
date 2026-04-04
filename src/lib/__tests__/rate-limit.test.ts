import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { rateLimit, getClientIp } from '../rate-limit'

// Access the module-level store via the module itself
// We reset by manipulating time so entries expire naturally.

describe('rateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows the first request', () => {
    const result = rateLimit('test-key-1', 3, 60_000)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(2)
  })

  it('counts up to the limit', () => {
    const key = 'test-key-2'
    rateLimit(key, 3, 60_000)
    rateLimit(key, 3, 60_000)
    const third = rateLimit(key, 3, 60_000)
    expect(third.allowed).toBe(true)
    expect(third.remaining).toBe(0)
  })

  it('blocks requests over the limit', () => {
    const key = 'test-key-3'
    rateLimit(key, 2, 60_000)
    rateLimit(key, 2, 60_000)
    const blocked = rateLimit(key, 2, 60_000)
    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
  })

  it('resets after the window expires', () => {
    const key = 'test-key-4'
    rateLimit(key, 2, 60_000)
    rateLimit(key, 2, 60_000)
    // Advance time past the window
    vi.advanceTimersByTime(61_000)
    const result = rateLimit(key, 2, 60_000)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(1)
  })

  it('returns resetAt in the future', () => {
    const now = Date.now()
    const { resetAt } = rateLimit('test-key-5', 5, 60_000)
    expect(resetAt).toBeGreaterThan(now)
  })

  it('uses separate counters for different keys', () => {
    rateLimit('key-a', 1, 60_000)
    const second = rateLimit('key-a', 1, 60_000)
    const other = rateLimit('key-b', 1, 60_000)
    expect(second.allowed).toBe(false)
    expect(other.allowed).toBe(true)
  })
})

describe('getClientIp', () => {
  it('reads x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })
    expect(getClientIp(headers)).toBe('1.2.3.4')
  })

  it('falls back to x-real-ip', () => {
    const headers = new Headers({ 'x-real-ip': '9.9.9.9' })
    expect(getClientIp(headers)).toBe('9.9.9.9')
  })

  it('returns "unknown" when no IP header is present', () => {
    expect(getClientIp(new Headers())).toBe('unknown')
  })
})
