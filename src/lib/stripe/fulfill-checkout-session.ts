import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';

export type FulfillCheckoutResult =
  | { ok: true; subscriptionId: string | null; alreadyFulfilled: boolean; skipped?: 'storage' | 'unpaid' }
  | { ok: false; error: string; retryable?: boolean };

type AdminClient = SupabaseClient;

async function resolveUserId(
  full: Stripe.Checkout.Session,
  stripe: Stripe,
  admin: AdminClient
): Promise<string | undefined> {
  const fromMeta = full.metadata?.user_id?.trim();
  if (fromMeta) return fromMeta;

  const customerId = typeof full.customer === 'string' ? full.customer : undefined;
  if (customerId) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer && !('deleted' in customer)) {
        const uid = (customer.metadata as Record<string, string> | undefined)?.supabase_user_id;
        if (uid) return uid;
      }
    } catch {
      /* ignore */
    }
  }

  const email = (full.customer_details?.email || '').toLowerCase();
  if (email) {
    const { data: userRow } = await admin.from('users').select('id').eq('email', email).maybeSingle();
    if (userRow?.id) return userRow.id;
  }

  return undefined;
}

async function recordPaymentOnce(
  admin: AdminClient,
  payload: Record<string, unknown>
): Promise<void> {
  const pi = payload.stripe_payment_intent_id as string | null | undefined;
  if (pi) {
    const { data: existing } = await admin
      .from('payments')
      .select('id')
      .eq('stripe_payment_intent_id', pi)
      .maybeSingle();
    if (existing?.id) return;
  }
  try {
    await admin.from('payments').insert(payload);
  } catch {
    /* best-effort */
  }
}

/**
 * Concede asientos por un Checkout Session pagado (idempotente por session.id).
 * Usado por webhook (fuente de verdad) y confirm-session (refuerzo UX).
 */
export async function fulfillCheckoutSession(
  admin: AdminClient,
  stripe: Stripe,
  sessionId: string
): Promise<FulfillCheckoutResult> {
  const { data: existingFulfillment } = await admin
    .from('stripe_checkout_fulfillments')
    .select('subscription_id')
    .eq('stripe_checkout_session_id', sessionId)
    .maybeSingle();

  if (existingFulfillment) {
    return {
      ok: true,
      subscriptionId: existingFulfillment.subscription_id ?? null,
      alreadyFulfilled: true,
    };
  }

  const full = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['line_items.data.price'],
  });

  if (full.metadata?.type === 'storage') {
    return { ok: true, subscriptionId: null, alreadyFulfilled: false, skipped: 'storage' };
  }

  if (full.payment_status !== 'paid') {
    return { ok: false, error: 'Checkout not paid', retryable: false };
  }

  const userId = await resolveUserId(full, stripe, admin);
  if (!userId) {
    return { ok: false, error: 'Could not resolve user for checkout', retryable: true };
  }

  const price = full.line_items?.data?.[0]?.price as Stripe.Price | undefined;
  const quantity = full.line_items?.data?.[0]?.quantity ?? 1;
  const planIdMeta = full.metadata?.plan_id?.trim();

  let plan: { id: string; days: number; amount_cents: number | null; currency: string | null } | null =
    null;

  if (planIdMeta) {
    const { data } = await admin
      .from('subscription_plans')
      .select('id, days, amount_cents, currency')
      .eq('id', planIdMeta)
      .maybeSingle();
    if (data?.id) plan = data;
  }

  if (!plan && price?.id) {
    const { data } = await admin
      .from('subscription_plans')
      .select('id, days, amount_cents, currency')
      .eq('stripe_price_id', price.id)
      .maybeSingle();
    if (data?.id) plan = data;
  }

  if (!plan?.days) {
    return { ok: false, error: 'Plan not found for checkout', retryable: true };
  }

  const now = new Date();
  const periodEnd = new Date(now.getTime() + plan.days * 24 * 60 * 60 * 1000);

  const customerId = typeof full.customer === 'string' ? full.customer : null;
  const paymentIntentId =
    typeof full.payment_intent === 'string'
      ? full.payment_intent
      : full.payment_intent && typeof full.payment_intent === 'object' && 'id' in full.payment_intent
        ? full.payment_intent.id
        : null;

  await recordPaymentOnce(admin, {
    user_id: userId,
    provider: 'stripe',
    stripe_payment_intent_id: paymentIntentId,
    stripe_invoice_id: null,
    receipt_url: full.url || null,
    amount_cents: full.amount_total ?? null,
    currency: (full.currency || 'EUR').toUpperCase(),
    description: `Checkout ${full.id}`,
    status: 'succeeded',
    paid_at: new Date().toISOString(),
  });

  const { data: inserted, error: insErr } = await admin
    .from('subscriptions')
    .insert({
      user_id: userId,
      plan_id: plan.id,
      status: 'active',
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: false,
      amount: full.amount_total ?? plan.amount_cents ?? 0,
      currency: (full.currency || plan.currency || 'EUR').toUpperCase(),
      seats: quantity,
      stripe_customer_id: customerId,
      stripe_subscription_id: paymentIntentId ?? sessionId,
      updated_at: now.toISOString(),
    })
    .select('id')
    .single();

  if (insErr || !inserted?.id) {
    return {
      ok: false,
      error: insErr?.message ?? 'Failed to insert subscription',
      retryable: true,
    };
  }

  const { error: fulfillmentErr } = await admin.from('stripe_checkout_fulfillments').insert({
    stripe_checkout_session_id: sessionId,
    user_id: userId,
    subscription_id: inserted.id,
  });

  if (fulfillmentErr) {
    if ((fulfillmentErr as { code?: string }).code === '23505') {
      return { ok: true, subscriptionId: inserted.id, alreadyFulfilled: true };
    }
    return { ok: false, error: fulfillmentErr.message, retryable: true };
  }

  return { ok: true, subscriptionId: inserted.id, alreadyFulfilled: false };
}
