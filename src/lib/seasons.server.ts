import 'server-only';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getSeasonYearsFor } from '@/lib/seasons';

/** Garantiza la fila de temporada vigente (service role). Idempotente por year_start/year_end. */
export async function ensureCurrentSeasonId(now: Date = new Date()): Promise<string> {
  const { year_start, year_end } = getSeasonYearsFor(now);
  const admin = getSupabaseAdmin();

  const { data: existing, error: readErr } = await admin
    .from('seasons')
    .select('id')
    .eq('year_start', year_start)
    .eq('year_end', year_end)
    .maybeSingle();

  if (readErr) throw readErr;
  if (existing?.id) return existing.id as string;

  const { data: inserted, error: insertErr } = await admin
    .from('seasons')
    .insert({ year_start, year_end })
    .select('id')
    .single();

  if (insertErr) {
    const { data: retry } = await admin
      .from('seasons')
      .select('id')
      .eq('year_start', year_start)
      .eq('year_end', year_end)
      .maybeSingle();
    if (retry?.id) return retry.id as string;
    throw insertErr;
  }

  return inserted.id as string;
}
