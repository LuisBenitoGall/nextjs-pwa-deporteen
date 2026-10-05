import 'server-only';

import { userOwnsMatch } from '@/lib/matches/ownership';
import type { AppSupabaseClient } from '@/lib/supabase/types';

export type MatchEditRow = {
  id: string;
  competition_id: string;
  player_id: string;
  date_at: string;
  place: string | null;
  rival_team_name: string | null;
};

export type MatchEditCompetition = {
  id: string;
  name: string;
  team_id: string | null;
};

export type MatchEditInitialPayload = {
  match: MatchEditRow;
  competition: MatchEditCompetition | null;
};

export type LoadMatchEditResult =
  | { ok: true; data: MatchEditInitialPayload }
  | { ok: false; reason: 'forbidden' | 'not_found' | 'error'; message?: string };

const MATCH_SELECT =
  'id, competition_id, player_id, date_at, place, rival_team_name';

export async function loadMatchEditInitialData(
  supabase: AppSupabaseClient,
  userId: string,
  matchId: string
): Promise<LoadMatchEditResult> {
  const owns = await userOwnsMatch(supabase, userId, matchId);
  if (!owns) return { ok: false, reason: 'forbidden' };

  const { data: m, error: mErr } = await supabase
    .from('matches')
    .select(MATCH_SELECT)
    .eq('id', matchId)
    .maybeSingle();

  if (mErr) return { ok: false, reason: 'error', message: mErr.message };
  if (!m) return { ok: false, reason: 'not_found' };

  const matchRow = m as MatchEditRow;

  const { data: comp, error: compErr } = await supabase
    .from('competitions')
    .select('id, name, team_id')
    .eq('id', matchRow.competition_id)
    .maybeSingle();

  if (compErr) return { ok: false, reason: 'error', message: compErr.message };

  return {
    ok: true,
    data: {
      match: matchRow,
      competition: (comp as MatchEditCompetition | null) ?? null,
    },
  };
}
