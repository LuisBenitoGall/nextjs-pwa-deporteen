import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-08-27.basil' });

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // Leer planId y units desde el body
  let planId = '';
  let units = 1;
  try {
    const body = await req.json();
    planId = String(body?.planId || '').trim();
    units = Math.max(1, Number(body?.units || 1));
  } catch {}
  if (!planId) return NextResponse.json({ error: 'planId is required' }, { status: 400 });

  // Guard: evitar compras duplicadas si ya existe suscripción activa
  try {
    const { data: latest } = await supabase
      .from('subscriptions')
      .select('current_period_end, status')
      .eq('user_id', user.id)
      .order('current_period_end', { ascending: false })
      .limit(1);
    const s = Array.isArray(latest) ? latest[0] : null;
    if (s) {
      const end = s.current_period_end ? new Date(s.current_period_end) : null;
      const statusBool = s.status === true || String(s.status || '').toLowerCase() === 'active';
      const isActive = Boolean(end && end.getTime() > Date.now() && statusBool);
      if (isActive) {
        return NextResponse.json({ error: 'Ya tienes una suscripción activa.' }, { status: 400 });
      }
    }
  } catch {}

  // crea/reusa customer y asegura metadata supabase_user_id
  const customers = await stripe.customers.list({ email: user.email || undefined, limit: 1 });
  let customer = customers.data[0] as Stripe.Customer | undefined;
  if (!customer) {
    customer = await stripe.customers.create({
      email: user.email || undefined,
      metadata: { supabase_user_id: user.id },
    });
  } else {
    const currentMetaUser = (customer.metadata as any)?.supabase_user_id;
    if (currentMetaUser !== user.id) {
      customer = await stripe.customers.update(customer.id, {
        metadata: { ...(customer.metadata as any), supabase_user_id: user.id },
      });
    }
  }

  // Crear/espejar vínculo en subscriptions (para que el webhook pueda resolver user_id por customer)
  try {
    await supabase
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        stripe_customer_id: customer.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
  } catch {}

  // Obtener el plan en Supabase (usar vista para mantener compatibilidad de UI)
  const { data: plan, error: planErr } = await supabase
    .from('subscription_plans')
    .select('id, name, stripe_price_id, active, free')
    .eq('id', planId)
    .maybeSingle();
  if (planErr || !plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  if (!plan.active || plan.free) return NextResponse.json({ error: 'Plan not purchasable' }, { status: 400 });
  if (!plan.stripe_price_id) return NextResponse.json({ error: 'Plan has no Stripe price' }, { status: 400 });

  // Crear Checkout como pago único (los precios creados en admin son one-time)
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customer.id,
    line_items: [
      { price: plan.stripe_price_id, quantity: units },
    ],
    allow_promotion_codes: true,
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/subscription?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/subscription?status=cancel`,
  });

  return NextResponse.json({ url: session.url });
}