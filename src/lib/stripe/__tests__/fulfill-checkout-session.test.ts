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
  latestSubscriptionEnd?: string | null;
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
      const chain = {
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: state.latestSubscriptionEnd
                      ? { current_period_end: state.latestSubscriptionEnd }
                      : null,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
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
      return chain;
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

  it('stacks renewal period from active current_period_end (Luis 7-B)', async () => {
    const futureEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    mockRetrieve.mockResolvedValue({
      id: 'cs_renew',
      payment_status: 'paid',
      metadata: { user_id: 'user-1', plan_id: 'plan-uuid', intent: 'renewal' },
      customer: 'cus_1',
      payment_intent: 'pi_renew',
      amount_total: 300,
      currency: 'eur',
      line_items: { data: [{ quantity: 1, price: { id: 'price_x' } }] },
    });

    const admin = buildAdmin({
      plan: { id: 'plan-uuid', days: 365, amount_cents: 150, currency: 'EUR' },
      latestSubscriptionEnd: futureEnd,
    });

    const before = Date.now();
    const result = await fulfillCheckoutSession(admin as any, stripe, 'cs_renew');
    expect(result.ok).toBe(true);

    const payload = admin.insertPayloads[0] as { current_period_end: string };
    const insertedEnd = new Date(payload.current_period_end).getTime();
    const expectedMin = new Date(futureEnd).getTime() + 365 * 24 * 60 * 60 * 1000 - 5000;
    expect(insertedEnd).toBeGreaterThanOrEqual(expectedMin);
    expect(insertedEnd).toBeGreaterThan(before + 365 * 24 * 60 * 60 * 1000);
  });
});
