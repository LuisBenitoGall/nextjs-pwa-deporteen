import 'server-only';

import type { AppSupabaseClient } from '@/lib/supabase/types';

export type CompetitionMatchRow = {
  id: string;
  date_at: string;
  place: string | null;
  is_home: boolean;
  rival_team_name: string | null;
  my_score: number | null;
  rival_score: number | null;
  competition_id: string;
  season_id: string | null;
  player_id: string;
  stats?: Record<string, unknown> | null;
};

export type CompetitionMatchesCompetition = {
  id: string;
  name: string;
  sport_id: string;
  season_id: string | null;
  team_id: string | null;
};

export type CompetitionMatchesSeason = {
  id: string;
  year_start: number | null;
  year_end: number | null;
};

export type CompetitionMatchesSport = {
  id: string;
  name: string | null;
  stats: unknown;
};

export type CompetitionMatchesInitialPayload = {
  competition: CompetitionMatchesCompetition;
  matches: CompetitionMatchRow[];
  season: CompetitionMatchesSeason | null;
  sport: CompetitionMatchesSport | null;
};

export type LoadCompetitionMatchesResult =
  | { ok: true; data: CompetitionMatchesInitialPayload }
  | { ok: false; reason: 'forbidden' | 'not_found' | 'error'; message?: string };

const COMPETITION_SELECT = 'id, name, sport_id, season_id, team_id';
const MATCH_SELECT =
  'id, date_at, place, is_home, rival_team_name, my_score, rival_score, competition_id, season_id, player_id, stats';

export async function loadCompetitionMatchesInitialData(
  supabase: AppSupabaseClient,
  userId: string,
  playerId: string,
  competitionId: string
): Promise<LoadCompetitionMatchesResult> {
  const [{ data: player }, { data: comp, error: compErr }] = await Promise.all([
    supabase.from('players').select('id').eq('id', playerId).eq('user_id', userId).maybeSingle(),
    supabase
      .from('competitions')
      .select(COMPETITION_SELECT)
      .eq('id', competitionId)
      .eq('player_id', playerId)
      .maybeSingle(),
  ]);

  if (!player) return { ok: false, reason: 'forbidden' };
  if (compErr) return { ok: false, reason: 'error', message: compErr.message };
  if (!comp) return { ok: false, reason: 'not_found' };

  const competition = comp as CompetitionMatchesCompetition;
  const compSeasonId = competition.season_id;
  const sportId = competition.sport_id;

  let matchesQuery = supabase
    .from('matches')
    .select(MATCH_SELECT)
    .eq('player_id', playerId)
    .eq('competition_id', competitionId);

  if (compSeasonId) {
    matchesQuery = matchesQuery.eq('season_id', compSeasonId);
  }

  const [seasonResult, sportResult, matchesResult] = await Promise.all([
    compSeasonId
      ? supabase
          .from('seasons')
          .select('id, year_start, year_end')
          .eq('id', compSeasonId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    sportId
      ? supabase.from('sports').select('id, name, stats').eq('id', sportId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    matchesQuery.order('date_at', { ascending: true }),
  ]);

  if (seasonResult.error) {
    return { ok: false, reason: 'error', message: seasonResult.error.message };
  }
  if (sportResult.error) {
    return { ok: false, reason: 'error', message: sportResult.error.message };
  }
  if (matchesResult.error) {
    return { ok: false, reason: 'error', message: matchesResult.error.message };
  }

  return {
    ok: true,
    data: {
      competition,
      matches: (matchesResult.data as CompetitionMatchRow[]) ?? [],
      season: (seasonResult.data as CompetitionMatchesSeason | null) ?? null,
      sport: (sportResult.data as CompetitionMatchesSport | null) ?? null,
    },
  };
}
