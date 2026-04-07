import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/adminGuard';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('competitions')
    .select('*')
    .order('id', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with player info
  const playerIds = [...new Set(data?.map((c) => c.player_id) ?? [])];
  const { data: players } = await supabase
    .from('players')
    .select('id, name, user_id')
    .in('id', playerIds);

  const playerMap = new Map(players?.map((p) => [p.id, p]) ?? []);

  const competitions = (data ?? []).map((c) => ({
    ...c,
    player: playerMap.get(c.player_id) ?? null,
  }));

  return NextResponse.json({ competitions });
}

export async function PATCH(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id, name, sport_id, club_id, team_id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (sport_id !== undefined) update.sport_id = sport_id;
  if (club_id !== undefined) update.club_id = club_id;
  if (team_id !== undefined) update.team_id = team_id;

  const { error } = await supabase.from('competitions').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('competitions').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
