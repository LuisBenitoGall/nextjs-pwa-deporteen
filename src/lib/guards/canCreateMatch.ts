// lib/guards/canCreateMatch.ts
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * Devuelve true si el jugador tiene acceso activo (fila en vista player_active_access).
 */
export async function canCreateMatch(userId: string, playerId: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('player_active_access')
    .select('player_id')
    .eq('user_id', userId)
    .eq('player_id', playerId)
    .maybeSingle();

  if (error) {
    return false;
  }
  return Boolean(data?.player_id);
}
