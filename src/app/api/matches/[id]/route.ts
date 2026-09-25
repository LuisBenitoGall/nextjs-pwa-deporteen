import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase/server';
import { userOwnsMatch } from '@/lib/matches/ownership';
import { deleteMatchMediaForMatches } from '@/lib/matchMedia/cleanup';

// PATCH para actualizar campos del match (marcador, notas, stats...)
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await getServerUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: matchId } = await context.params;
    if (!matchId) {
      return NextResponse.json({ error: 'matchId requerido' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const owns = await userOwnsMatch(supabase, user.id, matchId);
    if (!owns) {
      return NextResponse.json({ error: 'Partido no encontrado o sin permiso' }, { status: 404 });
    }

    const payload = await req.json();
    const update: Record<string, unknown> = {};
    if (typeof payload.my_score === 'number') update.my_score = payload.my_score;
    if (typeof payload.rival_score === 'number') update.rival_score = payload.rival_score;
    if (typeof payload.notes === 'string') update.notes = payload.notes;

    if ('stats' in payload) {
      if (payload.stats && typeof payload.stats === 'object') update.stats = payload.stats;
      else update.stats = null;
    }

    if ('date_at' in payload) {
      if (!payload.date_at) {
        update.date_at = null;
      } else if (typeof payload.date_at === 'string') {
        const parsed = new Date(payload.date_at);
        if (Number.isNaN(parsed.getTime())) {
          return NextResponse.json({ error: 'date_at inválido' }, { status: 400 });
        }
        update.date_at = parsed.toISOString();
      }
    }

    if ('place' in payload) {
      update.place = payload.place ?? null;
    }

    if ('rival_team_name' in payload) {
      update.rival_team_name = payload.rival_team_name ?? null;
    }

    update.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('matches')
      .update(update)
      .eq('id', matchId)
      .select('*')
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!data) {
      return NextResponse.json({ error: 'No se pudo actualizar el partido' }, { status: 404 });
    }
    return NextResponse.json({ data }, { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error inesperado';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE para eliminar un partido por id
export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await getServerUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: matchId } = await context.params;
    if (!matchId) {
      return NextResponse.json({ error: 'matchId requerido' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const owns = await userOwnsMatch(supabase, user.id, matchId);
    if (!owns) {
      return NextResponse.json({ error: 'Partido no encontrado o sin permiso' }, { status: 404 });
    }

    await deleteMatchMediaForMatches(supabase, user.id, [matchId]);

    const { data: deleted, error } = await supabase
      .from('matches')
      .delete()
      .eq('id', matchId)
      .select('id')
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!deleted?.id) {
      return NextResponse.json({ error: 'No se pudo eliminar el partido' }, { status: 404 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error inesperado';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
