import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const secret = process.env.STRIPE_SECRET_KEY;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!secret) return NextResponse.json({ error: 'Missing STRIPE_SECRET_KEY' }, { status: 500 });
    if (!siteUrl) return NextResponse.json({ error: 'Missing NEXT_PUBLIC_SITE_URL' }, { status: 500 });

    const stripe = new Stripe(secret, { apiVersion: '2025-08-27.basil' });

    // Find or create customer by email
    const customers = await stripe.customers.list({ email: user.email || undefined, limit: 1 });
    const customer = customers.data[0] || await stripe.customers.create({
      email: user.email || undefined,
      metadata: { supabase_user_id: user.id },
    });

    const returnUrl = `${siteUrl}/subscription`;
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to create portal session' }, { status: 500 });
  }
}
