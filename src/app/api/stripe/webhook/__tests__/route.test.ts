import { describe, it, expect, vi, beforeEach } from 'vitest'
import type Stripe from 'stripe'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockConstructEvent = vi.hoisted(() => vi.fn())
const mockRetrieveSession = vi.hoisted(() => vi.fn())
const mockRetrieveCustomer = vi.hoisted(() => vi.fn())

vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    webhooks: { constructEvent: mockConstructEvent },
    checkout: { sessions: { retrieve: mockRetrieveSession } },
    customers: { retrieve: mockRetrieveCustomer },
  })),
}))

// Supabase chain: .from().insert() / .from().upsert() / .from().select().eq().maybeSingle()
const mockMaybeSingle = vi.hoisted(() => vi.fn().mockResolvedValue({ data: null, error: null }))
const mockEq = vi.hoisted(() => vi.fn(() => ({ maybeSingle: mockMaybeSingle })))
const mockSelect = vi.hoisted(() => vi.fn(() => ({ eq: mockEq })))
const mockInsert = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }))
const mockUpsert = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }))
const mockFrom = vi.hoisted(() =>
  vi.fn(() => ({
    insert: mockInsert,
    upsert: mockUpsert,
    select: mockSelect,
  }))
)

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({ from: mockFrom }),
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: string, sig = 'valid-sig') {
  return new Request('http://localhost/api/stripe/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': sig },
    body,
  })
}

function makeCheckoutEvent(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Event {
  return {
    type: 'checkout.session.completed',
    data: { object: { id: 'cs_test_123', ...overrides } },
  } as any
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/stripe/webhook', () => {
  let POST: (req: Request) => Promise<Response>

  beforeEach(async () => {
    vi.resetModules()
    mockConstructEvent.mockClear()
    mockRetrieveSession.mockClear()
    mockRetrieveCustomer.mockClear()
    mockFrom.mockClear()
    mockInsert.mockClear()
    mockUpsert.mockClear()
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_fake'
    ;({ POST } = await import('../route'))
  })

  it('returns 400 when stripe-signature header is missing', async () => {
    const req = new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      body: 'payload',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(await res.text()).toContain('Missing Stripe signature')
  })

  it('returns 400 when constructEvent throws (invalid signature)', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('No signatures found')
    })
    const res = await POST(makeRequest('bad-payload'))
    expect(res.status).toBe(400)
    expect(await res.text()).toContain('No signatures found')
  })

  it('returns 200 with { received: true } for an unknown event type', async () => {
    mockConstructEvent.mockReturnValue({ type: 'customer.created', data: { object: {} } })
    const res = await POST(makeRequest('payload'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ received: true })
  })

  describe('checkout.session.completed', () => {
    beforeEach(() => {
      mockConstructEvent.mockReturnValue(makeCheckoutEvent())

      // Session retrieve: returns line items with price and customer
      mockRetrieveSession.mockResolvedValue({
        id: 'cs_test_123',
        customer: 'cus_abc',
        payment_intent: 'pi_abc',
        amount_total: 300,
        currency: 'eur',
        url: 'https://stripe.com/receipt',
        invoice: null,
        customer_details: { email: 'user@example.com' },
        line_items: {
          data: [{ price: { id: 'price_abc' }, quantity: 1 }],
        },
      })

      // Customer retrieve: has supabase_user_id in metadata
      mockRetrieveCustomer.mockResolvedValue({
        id: 'cus_abc',
        metadata: { supabase_user_id: 'user-uuid-123' },
      })
    })

    it('returns 200 with { received: true }', async () => {
      // subscription_plans lookup returns nothing → skip upsert
      mockMaybeSingle.mockResolvedValue({ data: null })
      const res = await POST(makeRequest('payload'))
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ received: true })
    })

    it('inserts a payment record', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null })
      await POST(makeRequest('payload'))
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-uuid-123',
          provider: 'stripe',
          status: 'succeeded',
        })
      )
    })

    it('upserts subscription when a matching plan is found', async () => {
      mockMaybeSingle.mockResolvedValue({
        data: { id: 'plan-1y', days: 365, amount_cents: 300, currency: 'EUR' },
      })
      await POST(makeRequest('payload'))
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-uuid-123',
          status: 'active',
          seats: 1,
        }),
        expect.objectContaining({ onConflict: 'user_id' })
      )
    })

    it('falls back to email lookup when customer has no metadata', async () => {
      mockRetrieveCustomer.mockResolvedValue({
        id: 'cus_abc',
        metadata: {}, // no supabase_user_id
      })
      // Email fallback: users table returns a row
      mockMaybeSingle.mockResolvedValue({ data: { id: 'user-from-email' } })
      await POST(makeRequest('payload'))
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'user-from-email' })
      )
    })
  })

  describe('payment_intent.payment_failed', () => {
    it('inserts a failed payment record', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_failed',
            customer: 'cus_abc',
            amount: 300,
            currency: 'eur',
          },
        },
      })
      mockRetrieveCustomer.mockResolvedValue({
        id: 'cus_abc',
        metadata: { supabase_user_id: 'user-uuid-123' },
      })
      await POST(makeRequest('payload'))
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          stripe_payment_intent_id: 'pi_failed',
          status: 'failed',
        })
      )
    })
  })
})
