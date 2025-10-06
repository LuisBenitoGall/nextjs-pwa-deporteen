import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// PATCH para actualizar campos del match (marcador, notas, stats...)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const matchId = params.id;
    if (!matchId) {
      return NextResponse.json({ error: 'matchId requerido' }, { status: 400 });
    }

    const payload = await req.json();
    // Whitelist de campos permitidos para evitar updates accidentales
    const update: Record<string, any> = {};
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

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('matches')
      .update(update)
      .eq('id', matchId)
      .select('*')
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error inesperado' }, { status: 500 });
  }
}
