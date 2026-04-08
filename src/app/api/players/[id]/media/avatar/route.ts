import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentSeasonId } from '@/lib/seasons';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: playerId } = await context.params;
    if (!playerId) return NextResponse.json({ error: 'playerId requerido' }, { status: 400 });

    const supabase = await createSupabaseServerClient();

    const body = await req.json().catch(() => null);
    const seasonId = body?.seasonId as string | undefined;
    const avatar = body?.avatar as string | undefined; // device uri / key local
    const mime = body?.mime as string | undefined;
    const bytes = body?.bytes as number | undefined;

    if (!seasonId || !avatar || !mime || typeof bytes !== 'number') {
      return NextResponse.json({ error: 'Faltan campos: seasonId, avatar, mime, bytes' }, { status: 400 });
    }
    if (!ALLOWED_MIME.has(mime)) {
      return NextResponse.json({ error: 'Formato de imagen no permitido.' }, { status: 400 });
    }
    if (bytes > MAX_BYTES) {
      return NextResponse.json({ error: 'La imagen supera el tamaño máximo permitido (5 MB).' }, { status: 400 });
    }

    const currentSeasonId = await getCurrentSeasonId(supabase, new Date());
    if (!currentSeasonId || String(currentSeasonId) !== String(seasonId)) {
      return NextResponse.json({ error: 'Solo se puede modificar el avatar de la temporada actual.' }, { status: 403 });
    }

    const { error } = await supabase
      .from('player_seasons')
      .update({ avatar })
      .eq('player_id', playerId)
      .eq('season_id', seasonId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error inesperado' }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: playerId } = await context.params;
    if (!playerId) return NextResponse.json({ error: 'playerId requerido' }, { status: 400 });

    const supabase = await createSupabaseServerClient();

    const url = new URL(req.url);
    const seasonId = url.searchParams.get('seasonId');
    if (!seasonId) return NextResponse.json({ error: 'seasonId requerido' }, { status: 400 });

    const currentSeasonId = await getCurrentSeasonId(supabase, new Date());
    if (!currentSeasonId || String(currentSeasonId) !== String(seasonId)) {
      return NextResponse.json({ error: 'Solo se puede eliminar el avatar de la temporada actual.' }, { status: 403 });
    }

    const { error } = await supabase
      .from('player_seasons')
      .update({ avatar: null })
      .eq('player_id', playerId)
      .eq('season_id', seasonId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error inesperado' }, { status: 500 });
  }
}
