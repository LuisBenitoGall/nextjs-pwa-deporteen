// src/lib/subscriptions.ts

/** Subscription row shape used for active check (status is text per Stripe). */
export type SubscriptionForActiveCheck = {
  status?: string | boolean | null;
  current_period_end?: string | null;
};

/**
 * Determines if a subscription is considered active (canonical criterion).
 * Active when: status IN ('active','trialing') AND (current_period_end == null OR current_period_end > now()).
 * Pure function for easy unit testing.
 */
export function isSubscriptionActive(sub: SubscriptionForActiveCheck | null | undefined): boolean {
  if (!sub) return false;
  const statusStr = String(sub.status ?? '').toLowerCase();
  const isActiveStatus = statusStr === 'active' || statusStr === 'trialing';
  if (!isActiveStatus) return false;
  const end = sub.current_period_end ? new Date(sub.current_period_end) : null;
  return end === null || end.getTime() > Date.now();
}

export async function getSubscriptionState(userId: string) {
  // Keep server-only dependency out of the module top-level so this file
  // can be safely imported from mixed graphs without failing compilation.
  const { createSupabaseServerClient } = await import('@/lib/supabase/server');
  const supabase = await createSupabaseServerClient();

  const { data: subs } = await supabase
    .from('subscriptions')
    .select('current_period_end, status')
    .eq('user_id', userId)
    .order('current_period_end', { ascending: false });

  const hasAny = !!subs?.length;
  const latest = subs?.[0] || null;
  const active = isSubscriptionActive(latest);

  return { hasAnySubscription: hasAny, isActiveSubscription: active };
}
