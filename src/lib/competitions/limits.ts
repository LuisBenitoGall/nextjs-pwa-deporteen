import type { SupabaseClient } from '@supabase/supabase-js';
import { LIMITS } from '@/config/constants';
import { isSubscriptionActive } from '@/lib/subscriptions/shared';

export type CompetitionCreateGate =
  | { ok: true }
  | { ok: false; reason: 'unauthenticated' | 'forbidden' | 'no_subscription' | 'limit_reached' };

export async function assertCanCreateCompetition(
  supabase: SupabaseClient,
  userId: string,
  playerId: string,
  seasonId: string
): Promise<CompetitionCreateGate> {
  const { data: player } = await supabase
    .from('players')
    .select('id, user_id')
    .eq('id', playerId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!player) return { ok: false, reason: 'forbidden' };

  const { data: subs } = await supabase
    .from('subscriptions')
    .select('current_period_end, status')
    .eq('user_id', userId)
    .order('current_period_end', { ascending: false });

  if (!isSubscriptionActive(subs?.[0])) {
    return { ok: false, reason: 'no_subscription' };
  }

  const { count, error } = await supabase
    .from('competitions')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', playerId)
    .eq('season_id', seasonId);

  if (error) return { ok: false, reason: 'forbidden' };

  if ((count ?? 0) >= LIMITS.COMPETITION_NUM_MAX_BY_SEASON) {
    return { ok: false, reason: 'limit_reached' };
  }

  return { ok: true };
}
