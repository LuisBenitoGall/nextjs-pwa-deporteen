// lib/seasons.ts
// Utilidades para calcular y obtener la temporada vigente
// con el modelo minimalista: seasons(id, year_start, year_end).

import type { SupabaseClient } from '@supabase/supabase-js';

/** Devuelve los años (inicio y fin) de la temporada a la que pertenece `date`. */
export function getSeasonYearsFor(date: Date): { year_start: number; year_end: number } {
  const y = date.getFullYear();
  // Meses en JS: 0=Ene, 7=Ago. Temporada: 1 Ago (incluido) -> 31 Jul
  const aug1 = new Date(y, 7, 1);
  const start = date >= aug1 ? y : y - 1;
  return { year_start: start, year_end: start + 1 };
}

/**
 * Obtiene el ID de la temporada vigente en la base de datos.
 * Lanza error si no existe fila para esos años.
 */
export async function getCurrentSeasonId(
  supabase: SupabaseClient,
  now: Date = new Date()
): Promise<string> {
  const { year_start, year_end } = getSeasonYearsFor(now);
  const { data, error } = await supabase
    .from('seasons')
    .select('id')
    .eq('year_start', year_start)
    .eq('year_end', year_end)
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) {
    throw new Error(`No existe temporada ${year_start}-${year_end}. Crea esa fila en 'seasons'.`);
  }
  return data.id as string;
}
