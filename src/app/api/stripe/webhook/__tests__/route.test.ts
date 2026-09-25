import { describe, it, expect, vi, beforeEach } from 'vitest'
import type Stripe from 'stripe'

const mockConstructEvent = vi.hoisted(() => vi.fn())
const mockRetrieveSession = vi.hoisted(() => vi.fn())

vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    webhooks: { constructEvent: mockConstructEvent },
    checkout: { sessions: { retrieve: mockRetrieveSession } },
  })),
}))

const mockFulfill = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ ok: true, subscriptionId: 'sub-1', alreadyFulfilled: false }),
)

vi.mock('@/lib/stripe/fulfill-checkout-session', () => ({
  fulfillCheckoutSession: mockFulfill,
}))

const mockMaybeSingle = vi.hoisted(() => vi.fn().mockResolvedValue({ data: null, error: null }))
const mockEq = vi.hoisted(() => vi.fn(() => ({ maybeSingle: mockMaybeSingle, eq: mockEq, order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis() })))
const mockUpdate = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }))
const mockInsert = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }))
const mockFrom = vi.hoisted(() =>
  vi.fn(() => ({
    insert: mockInsert,
    update: mockUpdate,
    select: vi.fn(() => ({ eq: mockEq, order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis() })),
  })),
)

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({ from: mockFrom }),
}))

function makeRequest(body: string, sig = 'valid-sig') {
  return new Request('http://localhost/api/stripe/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': sig },
    body,
  })
}

describe('POST /api/stripe/webhook', () => {
  let POST: (req: Request) => Promise<Response>

  beforeEach(async () => {
    vi.resetModules()
    mockConstructEvent.mockClear()
    mockRetrieveSession.mockClear()
    mockFulfill.mockClear()
    mockFrom.mockClear()
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_fake'
    ;({ POST } = await import('../route'))
  })

  it('returns 400 when stripe-signature header is missing', async () => {
    const req = new Request('http://localhost/api/stripe/webhook', { method: 'POST', body: 'payload' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('delegates athlete checkout to fulfillCheckoutSession', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_123' } },
    })
    mockRetrieveSession.mockResolvedValue({
      id: 'cs_test_123',
      metadata: {},
      payment_status: 'paid',
    })

    const res = await POST(makeRequest('payload'))
    expect(res.status).toBe(200)
    expect(mockFulfill).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'cs_test_123')
  })

  it('returns 500 when fulfill fails retryable', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_fail' } },
    })
    mockRetrieveSession.mockResolvedValue({ id: 'cs_fail', metadata: {} })
    mockFulfill.mockResolvedValueOnce({ ok: false, error: 'no user', retryable: true })

    const res = await POST(makeRequest('payload'))
    expect(res.status).toBe(500)
  })
})
