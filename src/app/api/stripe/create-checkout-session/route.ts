// /api/stripe/create-checkout-session.ts
import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

//const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const { planId, units } = await req.json();

  // ⚠️ Obtén el user_id del token de supabase en server
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: { user } } = await supabase.auth.getUser(); // si usas middleware, pásalo al body

  if (!user) return NextResponse.json({ error: 'No auth' }, { status: 401 });

  // Leemos plan para mostrar precio / días desde BD (o puedes mapear a los Price de Stripe)
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('id, days, price_cents, currency')
    .eq('id', planId)
    .maybeSingle();

  if (!plan) return NextResponse.json({ error: 'Plan inválido' }, { status: 400 });

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/subscription?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/subscription?status=cancel`,
    currency: plan.currency?.toLowerCase() || 'eur',
    line_items: [{
      // Si usas Prices de Stripe, usa price: '<price_xxx>'
      price_data: {
        currency: plan.currency?.toLowerCase() || 'eur',
        product_data: { name: 'Suscripción ' + planId },
        unit_amount: plan.price_cents, // total por jugador x periodo
      },
      quantity: units ?? 1,
    }],
    metadata: {
      user_id: user.id,
      plan_id: plan.id,
      units: String(units ?? 1),
    },
  });

  return NextResponse.json({ url: session.url });
}
