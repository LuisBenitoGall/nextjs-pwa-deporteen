// /api/stripe/create-checkout-session.ts
import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!secret) return NextResponse.json({ error: 'Missing STRIPE_SECRET_KEY' }, { status: 500 });
  if (!siteUrl) return NextResponse.json({ error: 'Missing NEXT_PUBLIC_SITE_URL' }, { status: 500 });

  const stripe = new Stripe(secret, { apiVersion: '2025-08-27.basil' });
  const supabase = await createSupabaseServerClient();

  const { planId, units: rawUnits } = await req.json();
  const qty = Math.max(1, parseInt(String(rawUnits ?? 1), 10));

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: plan, error: planErr } = await supabase
    .from('subscription_plans')
    .select('id, name, stripe_price_id, amount_cents, currency')
    .eq('id', planId)
    .eq('active', true)
    .eq('free', false)
    .maybeSingle();

  if (planErr || !plan || !plan.stripe_price_id) {
    return NextResponse.json({ error: 'Plan inválido' }, { status: 400 });
  }

  // Reutiliza cliente de Stripe si el usuario ya tiene uno.
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
    const customer = customers.data.find((c) => !('deleted' in c) && (c.metadata as any)?.supabase_user_id === user.id)
      || customers.data.find((c) => !('deleted' in c))
      || await stripe.customers.create({
        email: user.email || undefined,
        metadata: { supabase_user_id: user.id },
      });
    stripeCustomerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: stripeCustomerId,
    success_url: `${siteUrl}/subscription?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/subscription?status=cancel`,
    line_items: [
      {
        price: plan.stripe_price_id,
        quantity: qty,
      },
    ],
    metadata: {
      user_id: user.id,
      plan_id: plan.id,
      units: String(qty),
    },
    subscription_data: {
      metadata: {
        user_id: user.id,
        plan_id: plan.id,
      },
    },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
