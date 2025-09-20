// lib/guards/canCreateMatch.ts
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Devuelve true si el jugador tiene acceso activo.
 * Usa Service Role porque consulta por user_id desde el servidor.
 */
export async function canCreateMatch(userId: string, playerId: string) {
  const admin = createClient(url, serviceRole, { auth: { persistSession: false } });
  const { data, error } = await admin
    .from('player_active_access')
    .select('is_active')
    .eq('user_id', userId)
    .eq('player_id', playerId)
    .order('is_active', { ascending: false })
    .limit(1);

  if (error) {
    // si algo peta, mejor pecar de prudente
    return false;
  }
  return Boolean(data?.[0]?.is_active);
}
