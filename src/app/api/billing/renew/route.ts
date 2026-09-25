import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { LIMITS } from '@/config/constants';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!secret) return NextResponse.json({ error: 'Missing STRIPE_SECRET_KEY' }, { status: 500 });
  if (!siteUrl) {
    return NextResponse.json({ error: 'Missing NEXT_PUBLIC_SITE_URL/NEXT_PUBLIC_APP_URL' }, { status: 500 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  let body: { planId?: string; playerIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const planId = body.planId?.trim();
  const playerIds = Array.isArray(body.playerIds) ? body.playerIds.filter(Boolean) : [];
  if (!planId) return NextResponse.json({ error: 'Plan inválido' }, { status: 400 });
  if (!playerIds.length) return NextResponse.json({ error: 'Selecciona al menos un deportista' }, { status: 400 });

  const qty = Math.min(playerIds.length, LIMITS.CHECKOUT_MAX_UNITS);

  const { data: ownedPlayers, error: playersErr } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .in('id', playerIds);

  if (playersErr || !ownedPlayers || ownedPlayers.length !== playerIds.length) {
    return NextResponse.json({ error: 'Deportistas no válidos' }, { status: 400 });
  }

  const { data: plan, error: planErr } = await supabase
    .from('subscription_plans')
    .select('id, stripe_price_id')
    .eq('id', planId)
    .eq('active', true)
    .eq('free', false)
    .maybeSingle();

  if (planErr || !plan?.stripe_price_id) {
    return NextResponse.json({ error: 'Plan inválido' }, { status: 400 });
  }

  const stripe = new Stripe(secret, { apiVersion: '2025-08-27.basil' });

  let stripeCustomerId: string | undefined;
  const { data: existingCustomer } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .not('stripe_customer_id', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingCustomer?.stripe_customer_id) {
    stripeCustomerId = existingCustomer.stripe_customer_id;
  } else {
    const customers = await stripe.customers.list({ email: user.email || undefined, limit: 1 });
    const customer =
      customers.data.find(
        (c) => !('deleted' in c) && (c.metadata as Record<string, string>)?.supabase_user_id === user.id,
      ) ||
      (await stripe.customers.create({
        email: user.email || undefined,
        metadata: { supabase_user_id: user.id },
      }));
    stripeCustomerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: stripeCustomerId,
    success_url: `${siteUrl}/subscription?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/billing/renew?status=cancel`,
    line_items: [{ price: plan.stripe_price_id, quantity: qty }],
    metadata: {
      user_id: user.id,
      plan_id: plan.id,
      units: String(qty),
      intent: 'renewal',
      player_ids: playerIds.slice(0, 20).join(','),
    },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
