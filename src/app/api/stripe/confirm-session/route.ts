import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { session_id } = await req.json();
    if (!session_id) return NextResponse.json({ error: 'session_id is required' }, { status: 400 });

    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) return NextResponse.json({ error: 'Missing STRIPE_SECRET_KEY' }, { status: 500 });

    const stripe = new Stripe(secret, { apiVersion: '2025-08-27.basil' });
    const full = await stripe.checkout.sessions.retrieve(session_id, { expand: ['line_items.data.price'] });

    if (full.payment_status !== 'paid') {
      return NextResponse.json({ ok: false, message: 'session not paid', status: full.payment_status });
    }

    const customerId = full.customer as string;
    const price = full.line_items?.data?.[0]?.price as Stripe.Price | undefined;
    const quantity = full.line_items?.data?.[0]?.quantity ?? 1;

    // Resolve userId from customer metadata or email
    let userId: string | undefined;
    if (customerId) {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer && !('deleted' in customer)) {
        userId = (customer.metadata as any)?.supabase_user_id as string | undefined;
      }
    }
    if (!userId) {
      const email = (full.customer_details?.email || '').toLowerCase();
      if (email) {
        const { data: userRow } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', email)
          .maybeSingle();
        if (userRow?.id) userId = userRow.id;
      }
    }

    // Record payment
    try {
      await supabaseAdmin.from('payments').insert({
        user_id: userId || null,
        provider: 'stripe',
        stripe_payment_intent_id: full.payment_intent as string,
        stripe_invoice_id: null,
        receipt_url: full.invoice ? null : full.url || null,
        amount_cents: full.amount_total ?? null,
        currency: (full.currency || 'EUR').toUpperCase(),
        description: `Checkout ${full.id}`,
        status: 'succeeded',
        paid_at: new Date().toISOString(),
      });
    } catch {}

    // Apply subscription period from plan days
    if (userId && price?.id) {
      const { data: plan } = await supabaseAdmin
        .from('subscription_plans')
        .select('id, days, amount_cents, currency')
        .eq('stripe_price_id', price.id)
        .maybeSingle();

      if (plan?.days) {
        const now = new Date();
        const addedMs = plan.days * quantity * 24 * 60 * 60 * 1000;
        const endsAt = new Date(now.getTime() + addedMs).toISOString();

        await supabaseAdmin.from('subscriptions').upsert({
          user_id: userId,
          status: true,
          current_period_end: endsAt,
          cancel_at_period_end: false,
          amount: plan.amount_cents,
          currency: (plan.currency || 'eur').toUpperCase(),
          seats: quantity,
          updated_at: new Date().toISOString(),
          plan_id: plan.id,
        }, { onConflict: 'user_id' });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to confirm session' }, { status: 500 });
  }
}
