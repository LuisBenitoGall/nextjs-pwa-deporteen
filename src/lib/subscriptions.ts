// src/lib/subscriptions.ts
import 'server-only';
import { isSubscriptionActive } from '@/lib/subscriptions/shared';

export { isSubscriptionActive, type SubscriptionForActiveCheck } from '@/lib/subscriptions/shared';

export async function getSubscriptionState(userId: string) {
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
