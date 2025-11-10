// /api/stripe/confirm-session.ts
import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-08-27.basil' });

export async function POST(req: NextRequest) {
  const { session_id } = await req.json();
  if (!session_id) return NextResponse.json({ ok: false, error: 'Missing session_id' }, { status: 400 });

  const session = await stripe.checkout.sessions.retrieve(session_id, {
    expand: ['line_items.data.price']
  });
  if (session.payment_status !== 'paid') {
    return NextResponse.json({ ok: false, error: 'Unpaid session' }, { status: 400 });
  }

  const user_id = String(session.metadata?.user_id || '');
  const plan_id = String(session.metadata?.plan_id || '');
  const seats = parseInt(String(session.metadata?.units || '1'), 10) || 1;

  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent && 'id' in session.payment_intent
      ? session.payment_intent.id
      : null;

  if (!user_id || !plan_id) {
    return NextResponse.json({ ok: false, error: 'Missing metadata' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Leemos el plan (días y divisa)
  const { data: plan, error: planErr } = await supabase
    .from('subscription_plans')
    .select('id, days, currency, amount_cents, stripe_price_id')
    .eq('id', plan_id)
    .maybeSingle();

  if (planErr || !plan) {
    return NextResponse.json({ ok: false, error: 'Plan not found' }, { status: 400 });
  }

  // Para pagos únicos, calculamos el periodo de acceso basado en los días del plan
  const now = new Date();
  const addedMs = (plan.days ?? 365) * seats * 24 * 60 * 60 * 1000;
  const periodEnd = new Date(now.getTime() + addedMs);

  const identifiers = [paymentIntentId, session_id].filter(Boolean) as string[];
  let existingId: string | null = null;
  let existingStripeId: string | null = null;

  if (identifiers.length) {
    const { data: existingRows } = await supabase
      .from('subscriptions')
      .select('id, stripe_subscription_id')
      .in('stripe_subscription_id', identifiers as string[])
      .limit(1);
    if (existingRows && existingRows.length) {
      existingId = existingRows[0].id;
      existingStripeId = existingRows[0].stripe_subscription_id;
    }
  }

  const amount_total_cents = session.amount_total ?? (plan.amount_cents ?? 0) * seats;
  const currency = (session.currency || plan.currency || 'EUR').toUpperCase();

  const upsertPayload = {
    user_id,
    plan_id,
    seats,
    status: 'active' as const,
    current_period_end: periodEnd.toISOString(),
    stripe_customer_id: session.customer ? String(session.customer) : null,
    stripe_subscription_id: paymentIntentId ?? existingStripeId ?? session_id,
    amount: amount_total_cents,
    currency,
    cancel_at_period_end: false,
  };

  if (existingId) {
    const { error: updateErr } = await supabase
      .from('subscriptions')
      .update(upsertPayload)
      .eq('id', existingId);
    if (updateErr) {
      return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: existingId, already: true });
  }

  const { data: inserted, error: insErr } = await supabase
    .from('subscriptions')
    .insert(upsertPayload)
    .select('id')
    .single();

  if (insErr) {
    // Si choca con unique, devolvemos ok idempotente
    if ((insErr as any).code === '23505') {
      return NextResponse.json({ ok: true, idempotent: true });
    }
    return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: inserted?.id });
}
