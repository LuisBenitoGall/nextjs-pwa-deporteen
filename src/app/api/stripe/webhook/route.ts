import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) return new NextResponse('Missing Stripe signature', { status: 400 });
  const buf = Buffer.from(await req.arrayBuffer());

  let event: Stripe.Event;
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-08-27.basil' });
    event = stripe.webhooks.constructEvent(buf, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.resumed') {
  const sub = event.data.object as Stripe.Subscription;
    const customerId = sub.customer as string;

    // enlaza customer -> user
    const { data: userRow } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();

    // si no existe espejo, busca por metadata de customer
    let userId = userRow?.user_id as string | undefined;
    if (!userId) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-08-27.basil' });
      const customer = await stripe.customers.retrieve(customerId);
      if (customer && !('deleted' in customer)) {
        userId = (customer.metadata as any)?.supabase_user_id;
      }
    }

    if (userId) {
      // espejo de subscription
      const periodEnd = (sub as any).current_period_end
        ? new Date(((sub as any).current_period_end as number) * 1000).toISOString()
        : new Date().toISOString();
      const cancelAtPeriodEnd = (sub as any).cancel_at_period_end ?? false;

      await supabaseAdmin.from('subscriptions').upsert({
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: sub.id,
        status: sub.status,
        current_period_end: periodEnd,
        cancel_at_period_end: cancelAtPeriodEnd,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      // entitlement
      if (sub.status === 'active' || sub.status === 'trialing') {
        const endsAt = periodEnd;
        try {
          await supabaseAdmin.rpc('redeem_access_code', { p_code: 'STRIPE', p_user_id: userId });
        } catch {}
        // en lugar de usar el RPC de códigos, insertamos el entitlement directo
        await supabaseAdmin.from('user_entitlements').insert({
          user_id: userId,
          source: 'stripe',
          source_id: sub.id,
          starts_at: new Date().toISOString(),
          ends_at: endsAt,
        });
      }
    }
  }

  // Checkout de pago único completado
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-08-27.basil' });

    // Recuperar sesión con line items para identificar el price/quantity
    const full = await stripe.checkout.sessions.retrieve(session.id, { expand: ['line_items.data.price'] });
    const customerId = full.customer as string;
    const price = full.line_items?.data?.[0]?.price as Stripe.Price | undefined;
    const quantity = full.line_items?.data?.[0]?.quantity ?? 1;

    // Mapear customer -> user
    let userId: string | undefined;
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer && !('deleted' in customer)) {
        userId = (customer.metadata as any)?.supabase_user_id as string | undefined;
      }
    } catch {}
    
    // Fallback: resolver por email si falta metadata
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
    
    console.log('[Webhook checkout.session.completed]', { session_id: session.id, userId, customerId, price_id: price?.id });

    // Registrar pago
    try {
      await supabaseAdmin.from('payments').insert({
        user_id: userId,
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

    // Aplicar acceso según plan (sumar días * quantity)
    if (userId && price?.id) {
      const { data: plan } = await supabaseAdmin
        .from('subscription_plans')
        .select('id, days, amount_cents, currency')
        .eq('stripe_price_id', price.id)
        .maybeSingle();

      if (plan?.days) {
        const now = new Date();
        const addedMs = plan.days * quantity * 24 * 60 * 60 * 1000;
        const currentEnd = now;
        const endsAt = new Date(currentEnd.getTime() + addedMs).toISOString();

        // Upsert espejo en subscriptions con periodo simple (para acceso)
        const { error: subErr } = await supabaseAdmin.from('subscriptions').upsert({
          user_id: userId,
          status: true,
          current_period_end: endsAt,
          cancel_at_period_end: false,
          amount: plan.amount_cents,
          currency: (plan.currency || 'EUR').toUpperCase(),
          seats: quantity,
          updated_at: new Date().toISOString(),
          plan_id: plan.id,
        }, { onConflict: 'user_id' });
        
        if (subErr) {
          console.error('[Webhook] Error updating subscriptions:', subErr);
        } else {
          console.log('[Webhook] Subscription updated successfully for user:', userId);
        }
      }
    }
  }

  // Pago fallido
  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as Stripe.PaymentIntent;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-08-27.basil' });

    // Intentar mapear a customer y user
    const customerId = typeof pi.customer === 'string' ? pi.customer : undefined;
    let userId: string | undefined;
    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (customer && !('deleted' in customer)) {
          userId = (customer.metadata as any)?.supabase_user_id as string | undefined;
        }
      } catch {}
    }

    try {
      await supabaseAdmin.from('payments').insert({
        user_id: userId || null,
        provider: 'stripe',
        stripe_payment_intent_id: pi.id,
        amount_cents: pi.amount || null,
        currency: (pi.currency || 'EUR').toUpperCase(),
        description: 'Payment failed',
        status: 'failed',
        paid_at: new Date().toISOString(),
      });
    } catch {}
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    // opcional: marcar status en espejo. No tocamos entitlements pasados.
    await supabaseAdmin
      .from('subscriptions')
      .update({ status: sub.status, updated_at: new Date().toISOString() })
      .eq('stripe_subscription_id', sub.id);
  }

  return NextResponse.json({ received: true });
}