import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const supabaseAdmin = getSupabaseAdmin();
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

    console.log('[Webhook checkout.session.completed]', { session_id: session.id, userId, customerId, price_id: price?.id, type: full.metadata?.type });

    // Registrar pago (siempre, independientemente del tipo)
    try {
      await supabaseAdmin.from('payments').insert({
        user_id: userId,
        provider: 'stripe',
        stripe_payment_intent_id: full.payment_intent as string,
        stripe_invoice_id: null,
        receipt_url: full.invoice ? null : full.url || null,
        amount_cents: full.amount_total ?? null,
        currency: (full.currency || 'EUR').toUpperCase(),
        description: `Checkout ${full.id}${full.metadata?.type === 'storage' ? ' [almacenamiento]' : ''}`,
        status: 'succeeded',
        paid_at: new Date().toISOString(),
      });
    } catch {}

    // ── ALMACENAMIENTO (Cloudflare R2) ────────────────────────────────────────
    if (full.metadata?.type === 'storage') {
      const metaUserId   = full.metadata?.user_id   || userId;
      const metaPlanId   = full.metadata?.plan_id   || null;
      const metaGbAmount = parseInt(full.metadata?.gb_amount || '10', 10);

      if (metaUserId) {
        try {
          const now = new Date();
          const days = 365;
          const addedMs = days * 24 * 60 * 60 * 1000;

          const { data: existingStoreSub } = await supabaseAdmin
            .from('storage_subscriptions')
            .select('id, current_period_end')
            .eq('user_id', metaUserId)
            .order('current_period_end', { ascending: false })
            .limit(1)
            .maybeSingle();

          const existingEnd = existingStoreSub?.current_period_end
            ? new Date(existingStoreSub.current_period_end) : null;
          const baseDate = existingEnd && existingEnd > now ? existingEnd : now;
          const endsAt   = new Date(baseDate.getTime() + addedMs).toISOString();

          const storagePayload = {
            user_id: metaUserId,
            plan_id: metaPlanId,
            gb_amount: metaGbAmount || 10,
            amount_cents: full.amount_total ?? 0,
            currency: (full.currency || 'EUR').toUpperCase(),
            status: 'active' as const,
            current_period_start: now.toISOString(),
            current_period_end: endsAt,
            stripe_customer_id: customerId || null,
            stripe_payment_intent_id: full.payment_intent as string ?? null,
            updated_at: now.toISOString(),
          };

          if (existingStoreSub?.id) {
            const { error: updErr } = await supabaseAdmin
              .from('storage_subscriptions')
              .update(storagePayload)
              .eq('id', existingStoreSub.id);
            if (updErr) console.error('[Webhook] Error updating storage_subscriptions:', updErr);
            else console.log('[Webhook] Storage subscription updated for user:', metaUserId);
          } else {
            const { error: insErr } = await supabaseAdmin
              .from('storage_subscriptions')
              .insert(storagePayload);
            if (insErr) console.error('[Webhook] Error inserting storage_subscriptions:', insErr);
            else console.log('[Webhook] Storage subscription created for user:', metaUserId);
          }
        } catch (e) {
          console.error('[Webhook] Storage subscription error:', e);
        }
      }
      // No continuar con el flujo de subscriptions normales
      return NextResponse.json({ received: true });
    }

    // ── SUSCRIPCIÓN NORMAL (acceso deportistas) ───────────────────────────────
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

        // Extend from existing period end if it's in the future (stacking purchases),
        // otherwise start from now (new or expired subscription).
        const { data: existingSub } = await supabaseAdmin
          .from('subscriptions')
          .select('current_period_end')
          .eq('user_id', userId)
          .maybeSingle();
        const existingEnd = existingSub?.current_period_end
          ? new Date(existingSub.current_period_end)
          : null;
        const baseDate = existingEnd && existingEnd > now ? existingEnd : now;
        const endsAt = new Date(baseDate.getTime() + addedMs).toISOString();

        // Upsert espejo en subscriptions con periodo simple (para acceso)
        const { error: subErr } = await supabaseAdmin.from('subscriptions').upsert({
          user_id: userId,
          status: 'active',
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

  return NextResponse.json({ received: true });
}