import type { AppSupabaseClient } from '@/lib/supabase/types';
import { legacyProfileFromUser } from '@/lib/admin/appUsers';
import { isSubscriptionActive } from '@/lib/subscriptions/shared';
import type { UserDetailPayload } from '@/components/admin/usuarios/UserDetailClient';

export async function loadUserAdminDetail(
  supabase: AppSupabaseClient,
  userId: string,
  canMutate: boolean,
): Promise<UserDetailPayload | null> {
  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
  if (authError || !authUser?.user) return null;

  const { data: appUser } = await supabase
    .from('users')
    .select('id, name, surname, email, locale, role, status, admin_notes, created_at, updated_at')
    .eq('id', userId)
    .maybeSingle();

  const profile = appUser
    ? legacyProfileFromUser(appUser)
    : legacyProfileFromUser({
        id: userId,
        name: '',
        surname: '',
        email: authUser.user.email ?? null,
      });

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select(
      'id, user_id, plan_id, status, current_period_end, created_at, updated_at, amount, currency, seats',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const subscriptionIds = (subscriptions ?? []).map((s) => s.id);
  const { data: subPlayers } = subscriptionIds.length
    ? await supabase
        .from('subscription_players')
        .select('id, subscription_id, player_id, linked_at, unlinked_at')
        .in('subscription_id', subscriptionIds)
    : { data: [] as const };

  const activeLinks = (subPlayers ?? []).filter((sp) => !sp.unlinked_at);
  const playerIds = [...new Set(activeLinks.map((sp) => sp.player_id))];
  const { data: linkedPlayersMeta } = playerIds.length
    ? await supabase.from('players').select('id, full_name, status').in('id', playerIds)
    : { data: [] as const };
  const playerNameMap = new Map((linkedPlayersMeta ?? []).map((p) => [p.id, p]));

  const subscriptionsEnriched = (subscriptions ?? []).map((sub) => {
    const links = activeLinks.filter((sp) => sp.subscription_id === sub.id);
    return {
      ...sub,
      is_active: isSubscriptionActive(sub),
      linked_players: links.map((l) => ({
        player_id: l.player_id,
        full_name: playerNameMap.get(l.player_id)?.full_name ?? null,
        linked_at: l.linked_at,
      })),
      seats_used: links.length,
      seats_free: Math.max(0, Number(sub.seats ?? 0) - links.length),
    };
  });

  const { data: players } = await supabase
    .from('players')
    .select('id, full_name, user_id, birthday, status, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('id, name, amount_cents, currency, active, free')
    .order('amount_cents');

  const defaultFreePlanId = (plans ?? []).find((p) => p.free === true)?.id ?? null;

  const u = authUser.user;

  return {
    can_mutate: canMutate,
    user: {
      id: userId,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      confirmed_at: u.confirmed_at ?? null,
      banned_until: u.banned_until ?? null,
      username: profile.username,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      locale: appUser?.locale ?? null,
      role: appUser?.role ?? null,
      status: appUser?.status ?? null,
      admin_notes: appUser?.admin_notes ?? null,
    },
    subscriptions: subscriptionsEnriched,
    subscription_history: (subscriptions ?? []).map((s) => ({
      id: s.id,
      period_start: s.created_at,
      period_end: s.current_period_end,
      amount_paid: s.amount,
      currency: s.currency,
      status: s.status,
      seats: s.seats,
    })),
    players: (players ?? []).map((p) => ({
      id: p.id,
      full_name: p.full_name,
      status: p.status,
      birthday: p.birthday,
      created_at: p.created_at,
    })),
    plans: plans ?? [],
    default_free_plan_id: defaultFreePlanId,
  };
}
