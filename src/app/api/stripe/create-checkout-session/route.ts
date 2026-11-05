// /api/stripe/create-checkout-session.ts
import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { LIMITS } from '@/config/constants';
import { resolveStripeCustomerId } from '@/lib/stripe-customer';

function stripeCheckoutErrorMessage(err: unknown): string {
  if (err instanceof Stripe.errors.StripeError) {
    return err.message;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return 'No se pudo iniciar el pago con Stripe.';
}

export const runtime = 'nodejs';

async function parseCheckoutBody(req: NextRequest): Promise<{ planId?: string; units?: unknown }> {
  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return req.json();
  }
  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    const form = await req.formData();
    return {
      planId: form.get('planId')?.toString(),
      units: form.get('units')?.toString(),
    };
  }
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export async function POST(req: NextRequest) {
  try {
  const secret = process.env.STRIPE_SECRET_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!secret) return NextResponse.json({ error: 'Missing STRIPE_SECRET_KEY' }, { status: 500 });
  if (!siteUrl) {
    return NextResponse.json({ error: 'Missing NEXT_PUBLIC_SITE_URL/NEXT_PUBLIC_APP_URL' }, { status: 500 });
  }

  const stripe = new Stripe(secret, { apiVersion: '2025-08-27.basil' });
  const supabase = await createSupabaseServerClient();

  const { planId, units: rawUnits } = await parseCheckoutBody(req);
  const qty = Math.min(
    Math.max(1, parseInt(String(rawUnits ?? 1), 10)),
    LIMITS.CHECKOUT_MAX_UNITS,
  );
  if (!Number.isFinite(qty)) {
    return NextResponse.json({ error: 'Cantidad inválida' }, { status: 400 });
  }

  if (!planId || typeof planId !== 'string') {
    return NextResponse.json({ error: 'Plan inválido' }, { status: 400 });
  }

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: plan, error: planErr } = await supabase
    .from('subscription_plans')
    .select('id, name, stripe_price_id, amount_cents, currency')
    .eq('id', planId)
    .eq('active', true)
    .eq('free', false)
    .maybeSingle();

  if (planErr || !plan) {
    return NextResponse.json({ error: 'Plan inválido' }, { status: 400 });
  }
  if (!plan.stripe_price_id?.trim()) {
    return NextResponse.json(
      { error: 'Este plan no está vinculado a Stripe (falta stripe_price_id)' },
      { status: 400 },
    );
  }

  const stripeCustomerId = await resolveStripeCustomerId({
    supabase,
    stripe,
    userId: user.id,
    userEmail: user.email,
  });
  if (!stripeCustomerId) {
    return NextResponse.json(
      { error: 'No se pudo vincular tu cuenta con Stripe. Inténtalo de nuevo más tarde.' },
      { status: 502 },
    );
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
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
    allow_promotion_codes: true,
  });

  if (req.headers.get('accept')?.includes('text/html')) {
    if (session.url) return NextResponse.redirect(session.url, 303);
    return NextResponse.json({ error: 'No checkout URL' }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[create-checkout-session]', err);
    return NextResponse.json({ error: stripeCheckoutErrorMessage(err) }, { status: 502 });
  }
}
