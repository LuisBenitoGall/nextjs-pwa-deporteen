import type { SupabaseClient } from '@supabase/supabase-js';

/** Comprueba que el partido pertenece a un jugador del usuario autenticado. */
export async function userOwnsMatch(
  supabase: SupabaseClient,
  userId: string,
  matchId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('matches')
    .select('id, player_id, players!inner(user_id)')
    .eq('id', matchId)
    .maybeSingle();

  if (error || !data) return false;
  const ownerId = (data as { players?: { user_id?: string } }).players?.user_id;
  return ownerId === userId;
}
