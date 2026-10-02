import 'server-only';

import { getCurrentSeasonId } from '@/lib/seasons';
import { userOwnsMatch } from '@/lib/matches/ownership';
import type { AppSupabaseClient } from '@/lib/supabase/types';

export type LiveMatchRow = {
  id: string;
  competition_id: string;
  sport_id: string;
  season_id: string | null;
  date_at: string;
  place: string | null;
  is_home: boolean;
  rival_team_name: string | null;
  my_score: number | null;
  rival_score: number | null;
  notes: string | null;
  stats: Record<string, unknown> | null;
  player_id: string;
  status?: string | null;
  updated_at?: string | null;
};

export type LiveMatchCompetition = {
  id: string;
  name: string;
  sport_id: string;
  season_id: string | null;
  team_id: string | null;
};

export type LiveMatchSeason = {
  id: string;
  year_start?: number | null;
  year_end?: number | null;
};

export type LiveMatchSport = {
  id: string;
  name: string | null;
  stats: unknown;
};

export type LiveMatchTeam = {
  id: string;
  name: string | null;
};

export type LiveMatchInitialPayload = {
  match: LiveMatchRow;
  competition: LiveMatchCompetition | null;
  sport: LiveMatchSport | null;
  myTeam: LiveMatchTeam | null;
  season: LiveMatchSeason | null;
};

export type LoadLiveMatchResult =
  | { ok: true; data: LiveMatchInitialPayload }
  | { ok: false; reason: 'forbidden' | 'not_found' | 'error'; message?: string };

const MATCH_SELECT =
  'id, competition_id, sport_id, season_id, date_at, place, is_home, rival_team_name, my_score, rival_score, notes, stats, player_id, status, updated_at';

export async function loadLiveMatchInitialData(
  supabase: AppSupabaseClient,
  userId: string,
  matchId: string
): Promise<LoadLiveMatchResult> {
  const owns = await userOwnsMatch(supabase, userId, matchId);
  if (!owns) return { ok: false, reason: 'forbidden' };

  const { data: m, error: mErr } = await supabase
    .from('matches')
    .select(MATCH_SELECT)
    .eq('id', matchId)
    .maybeSingle();

  if (mErr) return { ok: false, reason: 'error', message: mErr.message };
  if (!m) return { ok: false, reason: 'not_found' };

  const matchRow = m as LiveMatchRow;

  const [{ data: comp, error: compErr }, { data: sp, error: sportErr }] = await Promise.all([
    supabase
      .from('competitions')
      .select('id, name, sport_id, season_id, team_id')
      .eq('id', matchRow.competition_id)
      .maybeSingle(),
    supabase.from('sports').select('id, name, stats').eq('id', matchRow.sport_id).maybeSingle(),
  ]);

  if (compErr) return { ok: false, reason: 'error', message: compErr.message };
  if (sportErr) return { ok: false, reason: 'error', message: sportErr.message };

  const competition = (comp as LiveMatchCompetition | null) ?? null;
  const sport = (sp as LiveMatchSport | null) ?? null;

  let season: LiveMatchSeason | null = null;
  let seasonId = matchRow.season_id ?? competition?.season_id ?? null;
  if (!seasonId) {
    try {
      seasonId = await getCurrentSeasonId(supabase, new Date(matchRow.date_at));
    } catch {
      seasonId = null;
    }
  }
  if (seasonId) {
    const { data: seasonRow } = await supabase
      .from('seasons')
      .select('id, year_start, year_end')
      .eq('id', seasonId)
      .maybeSingle();
    season = (seasonRow as LiveMatchSeason | null) ?? null;
  }

  let myTeam: LiveMatchTeam | null = null;
  if (competition?.team_id) {
    const { data: teamRow } = await supabase
      .from('teams')
      .select('id, name')
      .eq('id', competition.team_id)
      .maybeSingle();
    myTeam = (teamRow as LiveMatchTeam | null) ?? null;
  }

  return {
    ok: true,
    data: {
      match: matchRow,
      competition,
      sport,
      myTeam,
      season,
    },
  };
}
