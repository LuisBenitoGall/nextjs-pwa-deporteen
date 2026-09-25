import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { fulfillCheckoutSession } from '@/lib/stripe/fulfill-checkout-session';

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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook Error';
    return new NextResponse(`Webhook Error: ${message}`, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-08-27.basil' });

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const full = await stripe.checkout.sessions.retrieve(session.id, { expand: ['line_items.data.price'] });

    // ── ALMACENAMIENTO (Cloudflare R2) ────────────────────────────────────────
    if (full.metadata?.type === 'storage') {
      const customerId = full.customer as string;
      let userId: string | undefined = full.metadata?.user_id?.trim() || undefined;
      if (!userId && customerId) {
        try {
          const customer = await stripe.customers.retrieve(customerId);
          if (customer && !('deleted' in customer)) {
            userId = (customer.metadata as Record<string, string> | undefined)?.supabase_user_id;
          }
        } catch {
          /* ignore */
        }
      }

      const metaUserId = full.metadata?.user_id || userId;
      const metaPlanId = full.metadata?.plan_id || null;
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
            ? new Date(existingStoreSub.current_period_end)
            : null;
          const baseDate = existingEnd && existingEnd > now ? existingEnd : now;
          const endsAt = new Date(baseDate.getTime() + addedMs).toISOString();

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
            stripe_payment_intent_id: (full.payment_intent as string) ?? null,
            updated_at: now.toISOString(),
          };

          if (existingStoreSub?.id) {
            await supabaseAdmin.from('storage_subscriptions').update(storagePayload).eq('id', existingStoreSub.id);
          } else {
            await supabaseAdmin.from('storage_subscriptions').insert(storagePayload);
          }
        } catch (e) {
          console.error('[Webhook] Storage subscription error:', e);
        }
      }
      return NextResponse.json({ received: true });
    }

    const result = await fulfillCheckoutSession(supabaseAdmin, stripe, session.id);
    if (!result.ok && result.retryable) {
      console.error('[Webhook] fulfillCheckoutSession failed:', result.error);
      return new NextResponse(result.error, { status: 500 });
    }
    if (!result.ok) {
      console.error('[Webhook] fulfillCheckoutSession non-retryable:', result.error);
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as Stripe.PaymentIntent;
    let userId: string | undefined;
    const customerId = typeof pi.customer === 'string' ? pi.customer : undefined;
    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (customer && !('deleted' in customer)) {
          userId = (customer.metadata as Record<string, string> | undefined)?.supabase_user_id;
        }
      } catch {
        /* ignore */
      }
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
    } catch {
      /* ignore */
    }
  }

  return NextResponse.json({ received: true });
}
