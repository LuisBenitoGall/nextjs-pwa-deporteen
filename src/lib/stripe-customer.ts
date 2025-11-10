import Stripe from 'stripe';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

interface ResolveCustomerParams {
  supabase: SupabaseServerClient;
  stripe: Stripe;
  userId: string;
  userEmail?: string | null;
}

export async function resolveStripeCustomerId({
  supabase,
  stripe,
  userId,
  userEmail,
}: ResolveCustomerParams): Promise<string | null> {
  try {
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .not('stripe_customer_id', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.stripe_customer_id) {
      return existing.stripe_customer_id as string;
    }

    const listParams: Stripe.CustomerListParams = { limit: 10 };
    if (userEmail) listParams.email = userEmail;

    const customers = await stripe.customers.list(listParams);
    const candidate = customers.data
      .filter((c): c is Stripe.Customer => !('deleted' in c))
      .find((c) => (c.metadata as any)?.supabase_user_id === userId)
      || customers.data.find((c): c is Stripe.Customer => !('deleted' in c));

    if (candidate) {
      const currentMeta = (candidate.metadata || {}) as Record<string, string>;
      if (currentMeta.supabase_user_id !== userId) {
        try {
          await stripe.customers.update(candidate.id, {
            metadata: { ...currentMeta, supabase_user_id: userId },
          });
        } catch (err) {
          console.warn('resolveStripeCustomerId: metadata update failed', err);
        }
      }
      return candidate.id;
    }

    const created = await stripe.customers.create({
      email: userEmail || undefined,
      metadata: { supabase_user_id: userId },
    });
    return created.id;
  } catch (err) {
    console.error('resolveStripeCustomerId error', err);
    return null;
  }
}
