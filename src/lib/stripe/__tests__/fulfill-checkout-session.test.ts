import { describe, it, expect, vi, beforeEach } from 'vitest';
import type Stripe from 'stripe';
import { fulfillCheckoutSession } from '../fulfill-checkout-session';

const mockRetrieve = vi.fn();
const stripe = {
  checkout: { sessions: { retrieve: mockRetrieve } },
  customers: { retrieve: vi.fn() },
} as unknown as Stripe;

function buildAdmin(state: {
  fulfillment?: { subscription_id: string | null } | null;
  plan?: { id: string; days: number; amount_cents: number; currency: string } | null;
  insertSubId?: string;
}) {
  const fulfillmentRow = state.fulfillment ?? null;
  const insertPayloads: unknown[] = [];

  const from = vi.fn((table: string) => {
    if (table === 'stripe_checkout_fulfillments') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: fulfillmentRow, error: null }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }
    if (table === 'subscription_plans') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: state.plan ?? null, error: null }),
          }),
        }),
      };
    }
    if (table === 'subscriptions') {
      return {
        insert: vi.fn((payload: unknown) => {
          insertPayloads.push(payload);
          return {
            select: () => ({
              single: vi.fn().mockResolvedValue({
                data: { id: state.insertSubId ?? 'new-sub' },
                error: null,
              }),
            }),
          };
        }),
      };
    }
    if (table === 'payments') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }
    if (table === 'users') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
    }
    return {};
  });

  return { from, insertPayloads };
}

describe('fulfillCheckoutSession', () => {
  beforeEach(() => {
    mockRetrieve.mockReset();
  });

  it('is idempotent when fulfillment row exists', async () => {
    const admin = buildAdmin({ fulfillment: { subscription_id: 'existing-sub' } });
    const result = await fulfillCheckoutSession(admin as any, stripe, 'cs_dup');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.alreadyFulfilled).toBe(true);
      expect(result.subscriptionId).toBe('existing-sub');
    }
    expect(mockRetrieve).not.toHaveBeenCalled();
  });

  it('inserts a subscription row for a paid session', async () => {
    mockRetrieve.mockResolvedValue({
      id: 'cs_paid',
      payment_status: 'paid',
      metadata: { user_id: 'user-1', plan_id: 'plan-uuid' },
      customer: 'cus_1',
      payment_intent: 'pi_1',
      amount_total: 300,
      currency: 'eur',
      line_items: { data: [{ quantity: 2, price: { id: 'price_x' } }] },
    });

    const admin = buildAdmin({
      plan: { id: 'plan-uuid', days: 365, amount_cents: 150, currency: 'EUR' },
    });

    const result = await fulfillCheckoutSession(admin as any, stripe, 'cs_paid');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.subscriptionId).toBe('new-sub');
    expect(admin.insertPayloads.length).toBeGreaterThan(0);
  });
});
