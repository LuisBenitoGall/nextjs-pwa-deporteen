import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSignUp = vi.hoisted(() => vi.fn())

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { signUp: mockSignUp },
  })),
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/auth/signup', () => {
  let POST: (req: any) => Promise<Response>

  beforeEach(async () => {
    vi.resetModules()
    mockSignUp.mockClear()
    ;({ POST } = await import('../route'))
  })

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  })

  it('returns 500 when Supabase URL env var is missing', async () => {
    const res = await POST(makeRequest({ email: 'a@b.com', password: '123456' }))
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.message).toMatch(/supabase/i)
  })

  it('returns 400 when Supabase returns an error', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fake.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'fake-anon-key'
    mockSignUp.mockResolvedValue({
      data: {},
      error: { name: 'AuthWeakPasswordError', message: 'Password too weak' },
    })
    const res = await POST(makeRequest({ email: 'a@b.com', password: '123' }))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.code).toBe('AuthWeakPasswordError')
    expect(body.message).toBe('Password too weak')
  })

  it('returns 200 with user on successful signup', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fake.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'fake-anon-key'
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'user-abc', email: 'test@example.com' } },
      error: null,
    })
    const res = await POST(makeRequest({ email: 'test@example.com', password: 'secret123' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.user.id).toBe('user-abc')
  })

  it('normalizes email to lowercase before calling signUp', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fake.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'fake-anon-key'
    mockSignUp.mockResolvedValue({ data: { user: { id: '1' } }, error: null })
    await POST(makeRequest({ email: 'TEST@EXAMPLE.COM', password: 'pass' }))
    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'pass',
    })
  })

  it('returns 429 after exceeding the rate limit', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fake.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'fake-anon-key'
    mockSignUp.mockResolvedValue({ data: { user: { id: '1' } }, error: null })

    // vi.resetModules() in beforeEach gives a fresh rate-limit store each test.
    // Exhaust the limit (5 requests) within the same test run.
    for (let i = 0; i < 5; i++) {
      await POST(makeRequest({ email: `u${i}@example.com`, password: 'pass' }))
    }

    const blocked = await POST(makeRequest({ email: 'extra@example.com', password: 'pass' }))
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get('Retry-After')).toBeTruthy()
    expect(mockSignUp).toHaveBeenCalledTimes(5) // 6th never reaches Supabase
  })
})
