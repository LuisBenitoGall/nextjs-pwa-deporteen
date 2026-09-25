import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase/server';
import { assertCanCreateCompetition } from '@/lib/competitions/limits';
import { ensureCurrentSeasonId } from '@/lib/seasons.server';

type Body = {
  seasonId?: string | null;
  sportId?: string;
  categoryId?: string | null;
  competitionName?: string | null;
  clubName?: string | null;
  teamName?: string | null;
};

export async function POST(
  req: Request,
  context: { params: Promise<{ playerId: string }> }
) {
  try {
    const { user } = await getServerUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { playerId } = await context.params;
    const body = (await req.json()) as Body;

    if (!body.sportId) {
      return NextResponse.json({ error: 'sport_required' }, { status: 400 });
    }

    const seasonId = body.seasonId || (await ensureCurrentSeasonId());

    const gate = await assertCanCreateCompetition(
      await createSupabaseServerClient(),
      user.id,
      playerId,
      seasonId
    );
    if (!gate.ok) {
      const status =
        gate.reason === 'no_subscription' || gate.reason === 'limit_reached' ? 403 : 403;
      return NextResponse.json({ error: gate.reason }, { status });
    }

    const teamName = (body.teamName ?? '').trim();
    const clubName = (body.clubName ?? '').trim();
    if (!teamName) {
      return NextResponse.json({ error: 'team_required' }, { status: 400 });
    }
    if (!clubName) {
      return NextResponse.json({ error: 'club_required_for_team' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    const { data: club, error: clubErr } = await supabase
      .from('clubs')
      .upsert({ name: clubName, player_id: playerId }, { onConflict: 'player_id,name' })
      .select('id')
      .single();
    if (clubErr) return NextResponse.json({ error: clubErr.message }, { status: 400 });

    const { data: team, error: teamErr } = await supabase
      .from('teams')
      .upsert(
        {
          name: teamName,
          club_id: club.id,
          sport_id: body.sportId,
          player_id: playerId,
        },
        { onConflict: 'player_id,club_id,sport_id,name' }
      )
      .select('id')
      .single();
    if (teamErr) return NextResponse.json({ error: teamErr.message }, { status: 400 });

    const { data: competition, error: cmpErr } = await supabase
      .from('competitions')
      .insert({
        player_id: playerId,
        season_id: seasonId,
        sport_id: body.sportId,
        club_id: club.id,
        team_id: team.id,
        category_id: body.categoryId ?? null,
        name: (body.competitionName ?? '').trim() || null,
      })
      .select('id')
      .single();

    if (cmpErr) return NextResponse.json({ error: cmpErr.message }, { status: 400 });

    return NextResponse.json({ id: competition.id }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error inesperado';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
