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

    // 1) player_seasons del jugador
    const { data: psRows, error: psErr } = await supabase
      .from('player_seasons')
      .select('id, player_id, season_id, avatar')
      .eq('player_id', playerId);

    if (psErr) return NextResponse.json({ error: psErr.message }, { status: 400 });

    const playerSeasons = ((psRows as PlayerSeasonRow[]) || []).map(r => ({
      ...r,
      season_id: String(r.season_id),
    }));

    const seasonIds = [...new Set(playerSeasons.map(r => r.season_id))];
    if (!seasonIds.length) {
      return NextResponse.json({ playerId, currentSeasonId: null, seasons: [] }, { status: 200 });
    }

    // 2) seasons meta (estructura real: year_start/year_end)
    const { data: seasonRows, error: sErr } = await supabase
      .from('seasons')
      .select('id, year_start, year_end')
      .in('id', seasonIds);

    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 400 });

    const seasonsMap = new Map<string, SeasonRow>();
    (seasonRows as SeasonRow[] | null)?.forEach(s => seasonsMap.set(String(s.id), s));

    // 3) temporada actual según tu helper existente (misma lógica que usas en matches/live)
    const currentSeasonId = await getCurrentSeasonId(supabase, new Date());

    // 4) orden desc por year_start (si falta, cae al final)
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
            s?.year_start && s?.year_end ? `${s.year_start}/${s.year_end}` : (s ? `${s.year_start ?? ''}/${s.year_end ?? ''}` : r.season_id);

          return {
            playerSeasonId: r.id,
            seasonId: r.season_id,
            label,
            isCurrent: !!currentSeasonId && String(currentSeasonId) === String(r.season_id),
            avatar: r.avatar ?? null, // puntero local
          };
        }),
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error means unexpected, because humans' }, { status: 500 });
  }
}
