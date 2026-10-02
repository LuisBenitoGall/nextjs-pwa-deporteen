import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase/server';
import { dateAtInputToIso } from '@/lib/matches/parseDateAtInput';

type Body = {
  competition_id?: string;
  sport_id?: string;
  season_id?: string | null;
  date_at?: string;
  place?: string | null;
  is_home?: boolean;
  team_id?: string;
  rival_team_name?: string | null;
};

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await getServerUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: playerId } = await context.params;
    const body = (await req.json()) as Body;

    if (!body.competition_id) {
      return NextResponse.json({ error: 'competition_required' }, { status: 400 });
    }
    if (!body.sport_id) {
      return NextResponse.json({ error: 'sport_required' }, { status: 400 });
    }
    if (!body.date_at?.trim()) {
      return NextResponse.json({ error: 'date_required' }, { status: 400 });
    }

    const dateIso = dateAtInputToIso(body.date_at);
    if (!dateIso) {
      return NextResponse.json({ error: 'date_invalid' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    const { data: player, error: playerErr } = await supabase
      .from('players')
      .select('id')
      .eq('id', playerId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (playerErr || !player) {
      return NextResponse.json({ error: 'player_not_found' }, { status: 404 });
    }

    const { data: competition, error: compErr } = await supabase
      .from('competitions')
      .select('id, sport_id, season_id, team_id, player_id')
      .eq('id', body.competition_id)
      .eq('player_id', playerId)
      .maybeSingle();
    if (compErr || !competition) {
      return NextResponse.json({ error: 'competition_not_found' }, { status: 404 });
    }

    const teamId = competition.team_id || body.team_id;
    if (!teamId) {
      return NextResponse.json({ error: 'team_required' }, { status: 400 });
    }

    if (competition.sport_id !== body.sport_id) {
      return NextResponse.json({ error: 'sport_mismatch' }, { status: 400 });
    }

    const payload = {
      competition_id: body.competition_id,
      sport_id: body.sport_id,
      season_id: body.season_id ?? competition.season_id ?? null,
      date_at: dateIso,
      place: body.place?.trim() || null,
      is_home: body.is_home !== false,
      player_id: playerId,
      team_id: teamId,
      rival_team_name: body.rival_team_name?.trim() || null,
      my_score: 0,
      rival_score: 0,
      status: 'scheduled',
      notes: null,
      stats: null,
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('matches')
      .insert(payload)
      .select('id')
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 400 });
    }

    return NextResponse.json({ id: inserted.id }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error inesperado';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
