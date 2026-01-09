// src/lib/subscriptions.ts
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function getSubscriptionState(userId: string) {
  const supabase = await createSupabaseServerClient();

  const { data: subs } = await supabase
    .from('subscriptions')
    .select('current_period_end, status')
    .eq('user_id', userId)
    .order('current_period_end', { ascending: false });

  const hasAny = !!subs?.length;
  const latest = subs?.[0] || null;

  // Activa si:
  // 1) existe suscripción y
  // 2) current_period_end es futura y
  // 3) status es 'active' o 'trialing'
  let active = false;
  if (latest) {
    const end = latest.current_period_end ? new Date(latest.current_period_end) : null;
    const statusStr = String(latest.status || '').toLowerCase();
    const isActiveStatus = statusStr === 'active' || statusStr === 'trialing';
    active = Boolean(end && end.getTime() > Date.now() && isActiveStatus);
  }

  return { hasAnySubscription: hasAny, isActiveSubscription: active };
}
