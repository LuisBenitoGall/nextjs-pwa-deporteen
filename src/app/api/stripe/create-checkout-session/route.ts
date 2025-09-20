import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-08-27.basil' });

export async function POST() {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // TODO: si cobras por deportista, calcula quantity consultando tu tabla players
  let quantity = 1;
  try {
    const { count } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    quantity = Math.max(1, count || 1);
  } catch {}

  // crea/reusa customer
  const customers = await stripe.customers.list({ email: user.email || undefined, limit: 1 });
  const customer = customers.data[0] || await stripe.customers.create({ email: user.email || undefined, metadata: { supabase_user_id: user.id } });

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customer.id,
    line_items: [{ price: process.env.STRIPE_PRICE_ID_2Y!, quantity }],
    allow_promotion_codes: true,
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/subscription?status=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/subscription?status=cancel`,
  });

  return NextResponse.json({ url: session.url });
}