import type { SupabaseClient } from '@supabase/supabase-js';

/** Borrado blando de todos los jugadores del usuario (solo columnas reales en `players`). */
export async function deactivateUserPlayers(
  admin: SupabaseClient,
  userId: string,
  updatedAtIso?: string
): Promise<{ error: { message: string } | null }> {
  const payload: { status: false; updated_at?: string } = { status: false };
  if (updatedAtIso) payload.updated_at = updatedAtIso;

  const { error } = await admin.from('players').update(payload).eq('user_id', userId);

  return { error: error ? { message: error.message } : null };
}
