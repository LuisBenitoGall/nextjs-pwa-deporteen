import Stripe from 'stripe';
import { resolveStripeCustomerId, SupabaseServerClient } from './stripe-customer';

export type PaymentSummary = {
  id: string;
  amount: number | null;
  currency: string | null;
  paidAt: string | null;
  receiptUrl: string | null;
  description: string | null;
  provider: string;
  stripePaymentIntentId?: string | null;
  status?: string | null;
  refundedAmount?: number | null;
  source: 'supabase' | 'stripe';
};

export interface FetchUserPaymentsOptions {
  supabase: SupabaseServerClient;
  userId: string;
  userEmail?: string | null;
  stripeSecret?: string | null;
  limit?: number;
  offset?: number;
  subscriptionId?: string | null;
  includeSupabase?: boolean;
  includeStripe?: boolean;
}

export interface FetchUserPaymentsResult {
  payments: PaymentSummary[];
  total: number;
}

const DEFAULT_FETCH_LIMIT = 50;

export async function fetchUserPayments({
  supabase,
  userId,
  userEmail,
  stripeSecret,
  limit = 10,
  offset = 0,
  subscriptionId,
  includeSupabase = true,
  includeStripe = true,
}: FetchUserPaymentsOptions): Promise<FetchUserPaymentsResult> {
  const needed = Math.min(DEFAULT_FETCH_LIMIT, offset + limit + 20);

  const paymentsFromDb: PaymentSummary[] = [];
  if (includeSupabase) {
    const query = supabase
      .from('payments')
      .select(
        [
          'id',
          'amount_cents',
          'currency',
          'paid_at',
          'receipt_url',
          'description',
          'provider',
          'stripe_payment_intent_id',
          'status',
        ].join(','),
        { head: false }
      )
      .eq('user_id', userId)
      .order('paid_at', { ascending: false })
      .limit(needed);

    if (subscriptionId) {
      query.eq('subscription_id', subscriptionId);
    }

    const { data: paymentsRaw, error } = (await query) as unknown as { data: any[] | null; error: any };

    if (error) {
      console.error('fetchUserPayments supabase error', error);
    }

    (paymentsRaw || []).forEach((p) => {
      const centsRaw = p.amount_cents ?? null;
      const cents = centsRaw == null ? null : Number(typeof centsRaw === 'string' ? centsRaw : centsRaw);
      const status = p.status || null;
      const statusLower = status ? String(status).toLowerCase() : '';
      const isRefunded = statusLower.includes('refunded');
      paymentsFromDb.push({
        id: p.id,
        amount: cents,
        currency: (p.currency || 'EUR').toUpperCase(),
        paidAt: p.paid_at || null,
        receiptUrl: p.receipt_url || null,
        description: p.description || null,
        provider: p.provider || 'stripe',
        stripePaymentIntentId: p.stripe_payment_intent_id || null,
        status,
        refundedAmount: isRefunded ? cents : null,
        source: 'supabase',
      });
    });
  }

  const paymentsStripe: PaymentSummary[] = [];
  if (includeStripe && stripeSecret && !subscriptionId) {
    try {
      const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' });
      const stripeCustomerId = await resolveStripeCustomerId({
        supabase,
        stripe,
        userId,
        userEmail,
      });

      if (stripeCustomerId) {
        const stripeLimit = Math.min(100, needed);
        const intents = await stripe.paymentIntents.list({
          customer: stripeCustomerId,
          limit: stripeLimit,
          expand: ['data.latest_charge'],
        });

        intents.data.forEach((pi) => {
          const latestCharge = typeof pi.latest_charge === 'string' ? null : pi.latest_charge;
          const paidAtUnix = latestCharge?.created ?? pi.created;
          const receiptUrl = latestCharge?.receipt_url || null;
          const description = pi.description || latestCharge?.description || 'Stripe checkout';
          const amountCents = typeof pi.amount === 'number'
            ? pi.amount
            : typeof pi.amount_received === 'number'
              ? pi.amount_received
              : null;
          const refundedCents = latestCharge && typeof latestCharge.amount_refunded === 'number'
            ? latestCharge.amount_refunded
            : null;
          const stripeStatus = refundedCents && amountCents && refundedCents >= amountCents
            ? 'refunded'
            : refundedCents && refundedCents > 0
              ? 'partially_refunded'
              : pi.status;

          paymentsStripe.push({
            id: pi.id,
            amount: amountCents,
            currency: (pi.currency || 'EUR').toUpperCase(),
            paidAt: paidAtUnix ? new Date(paidAtUnix * 1000).toISOString() : null,
            receiptUrl,
            description,
            provider: 'stripe',
            stripePaymentIntentId: pi.id,
            status: stripeStatus,
            refundedAmount: refundedCents,
            source: 'stripe',
          });
        });
      }
    } catch (err) {
      console.error('fetchUserPayments stripe error', err);
    }
  }

  const mergedPaymentsMap = new Map<string, PaymentSummary>();
  [...paymentsFromDb, ...paymentsStripe].forEach((payment) => {
    const key = payment.stripePaymentIntentId || `db:${payment.id}`;
    const existing = mergedPaymentsMap.get(key);
    if (!existing) {
      mergedPaymentsMap.set(key, payment);
      return;
    }

    const merged: PaymentSummary = {
      ...existing,
      ...payment,
      amount: existing.amount ?? payment.amount ?? null,
      currency: existing.currency ?? payment.currency ?? null,
      paidAt: existing.paidAt || payment.paidAt || null,
      receiptUrl: existing.receiptUrl || payment.receiptUrl || null,
      description: existing.description || payment.description || null,
      provider: existing.provider || payment.provider || 'stripe',
      stripePaymentIntentId: existing.stripePaymentIntentId || payment.stripePaymentIntentId || null,
      status: payment.status || existing.status || null,
      refundedAmount: payment.refundedAmount ?? existing.refundedAmount ?? null,
      source: existing.source === 'supabase' ? 'supabase' : payment.source,
    };

    mergedPaymentsMap.set(key, merged);
  });

  const sorted = Array.from(mergedPaymentsMap.values()).sort((a, b) => {
    const aTime = a.paidAt ? new Date(a.paidAt).getTime() : 0;
    const bTime = b.paidAt ? new Date(b.paidAt).getTime() : 0;
    return bTime - aTime;
  });

  const paginated = sorted.slice(offset, offset + limit);
  return {
    payments: paginated,
    total: sorted.length,
  };
}
