// /api/stripe/confirm-session.ts
import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

export async function POST(req: NextRequest) {
  const { session_id } = await req.json();
  if (!session_id) return NextResponse.json({ ok: false, error: 'Missing session_id' }, { status: 400 });

  const session = await stripe.checkout.sessions.retrieve(session_id);
  if (session.payment_status !== 'paid') {
    return NextResponse.json({ ok: false, error: 'Unpaid session' }, { status: 400 });
  }

  const user_id = String(session.metadata?.user_id || '');
  const plan_id = String(session.metadata?.plan_id || '');
  const seats = parseInt(String(session.metadata?.units || '1'), 10) || 1;

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
    .select('id, days, currency, price_cents')
    .eq('id', plan_id)
    .maybeSingle();

  if (planErr || !plan) {
    return NextResponse.json({ ok: false, error: 'Plan not found' }, { status: 400 });
  }

  const now = new Date();
  const end = new Date(now.getTime() + (plan.days ?? 365) * 86400 * 1000);

  // Idempotencia: si ya existe fila con este stripe_session/subscription, no insertes
  const extId = (session.subscription as string) || session.id;

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('stripe_subscription_id', extId)
    .limit(1);

  if (existing && existing.length) {
    return NextResponse.json({ ok: true, id: existing[0].id, already: true });
  }

  const amount_total_cents = session.amount_total ?? (plan.price_cents * seats);
  const currency = (session.currency || plan.currency || 'EUR').toUpperCase();

  const insertPayload = {
    user_id,
    plan_id,
    seats,
    status: true,
    current_period_end: end.toISOString(),
    stripe_customer_id: session.customer ? String(session.customer) : null,
    stripe_subscription_id: extId,
    amount: amount_total_cents,
    currency,
  };

  const { data: inserted, error: insErr } = await supabase
    .from('subscriptions')
    .insert(insertPayload)
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
