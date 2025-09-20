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