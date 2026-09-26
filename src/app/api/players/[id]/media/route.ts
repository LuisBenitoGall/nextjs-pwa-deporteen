import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentSeasonId } from '@/lib/seasons';

type PlayerSeasonRow = {
  id: string;
  player_id: string;
  season_id: string;
  avatar: string | null;
};

type SeasonRow = {
  id: string;
  year_start: number | null;
  year_end: number | null;
};

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: playerId } = await context.params;
    if (!playerId) {
      return NextResponse.json({ error: 'playerId requerido' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: owned, error: ownErr } = await supabase
      .from('players')
      .select('id')
      .eq('id', playerId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (ownErr) {
      return NextResponse.json({ error: ownErr.message }, { status: 500 });
    }
    if (!owned) {
      return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 });
    }

    const { data: psRows, error: psErr } = await supabase
      .from('player_seasons')
      .select('id, player_id, season_id, avatar')
      .eq('player_id', playerId);

    if (psErr) return NextResponse.json({ error: psErr.message }, { status: 400 });

    const playerSeasons = ((psRows as PlayerSeasonRow[]) || []).map((r) => ({
      ...r,
      season_id: String(r.season_id),
    }));

    const seasonIds = [...new Set(playerSeasons.map((r) => r.season_id))];
    if (!seasonIds.length) {
      return NextResponse.json({ playerId, currentSeasonId: null, seasons: [] }, { status: 200 });
    }

    const { data: seasonRows, error: sErr } = await supabase
      .from('seasons')
      .select('id, year_start, year_end')
      .in('id', seasonIds);

    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 400 });

    const seasonsMap = new Map<string, SeasonRow>();
    (seasonRows as SeasonRow[] | null)?.forEach((s) => seasonsMap.set(String(s.id), s));

    const currentSeasonId = await getCurrentSeasonId(supabase, new Date());

    const ordered = playerSeasons.slice().sort((a, b) => {
      const sa = seasonsMap.get(a.season_id);
      const sb = seasonsMap.get(b.season_id);
      const ya = sa?.year_start ?? -1;
      const yb = sb?.year_start ?? -1;
      return yb - ya;
    });

    return NextResponse.json(
      {
        playerId,
        currentSeasonId,
        seasons: ordered.map((r) => {
          const s = seasonsMap.get(r.season_id);
          const label =
            s?.year_start && s?.year_end
              ? `${s.year_start}/${s.year_end}`
              : s
                ? `${s.year_start ?? ''}/${s.year_end ?? ''}`
                : r.season_id;

          return {
            playerSeasonId: r.id,
            seasonId: r.season_id,
            label,
            isCurrent: !!currentSeasonId && String(currentSeasonId) === String(r.season_id),
            avatar: r.avatar ?? null,
          };
        }),
      },
      { status: 200 }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error inesperado';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
