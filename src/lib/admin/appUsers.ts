import type { AppSupabaseClient } from '@/lib/supabase/types';
import type { Database } from '@/lib/database.types';

/** Campos que el panel admin esperaba de la tabla inexistente `profiles`. */
export type LegacyProfileDisplay = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

type UserRow = Database['public']['Tables']['users']['Row'];

export function legacyProfileFromUser(
  u: Pick<UserRow, 'id' | 'name' | 'surname' | 'email'>,
): LegacyProfileDisplay {
  const full_name = [u.name, u.surname].filter(Boolean).join(' ').trim() || null;
  return {
    id: u.id,
    username: u.email,
    full_name,
    avatar_url: null,
  };
}

export async function fetchLegacyProfilesByUserIds(
  supabase: AppSupabaseClient,
  ids: string[],
): Promise<LegacyProfileDisplay[]> {
  if (!ids.length) return [];
  const { data } = await supabase.from('users').select('id, name, surname, email').in('id', ids);
  return (data ?? []).map(legacyProfileFromUser);
}

export async function fetchAllLegacyProfiles(
  supabase: AppSupabaseClient,
): Promise<LegacyProfileDisplay[]> {
  const { data } = await supabase.from('users').select('id, name, surname, email');
  return (data ?? []).map(legacyProfileFromUser);
}

export function legacyProfileMap(profiles: LegacyProfileDisplay[]) {
  return new Map(profiles.map((p) => [p.id, p]));
}
