import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/adminGuard';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { writeAdminAuditLog } from '@/lib/admin/adminAuditLog';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, context: RouteContext) {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;

  const { id: userId } = await context.params;
  const body = await req.json().catch(() => null);
  const playerId = typeof body?.id === 'string' ? body.id : '';
  if (!playerId) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: player } = await supabase
    .from('players')
    .select('id, user_id, full_name, status')
    .eq('id', playerId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!player) return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body?.full_name !== undefined) update.full_name = body.full_name;
  if (body?.status !== undefined) update.status = body.status;

  const { error } = await supabase.from('players').update(update).eq('id', playerId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await writeAdminAuditLog(supabase, {
    actor_user_id: guard.user.id,
    target_user_id: userId,
    action: 'player_patch',
    payload: { player_id: playerId, update },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, context: RouteContext) {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;

  const { id: userId } = await context.params;
  const body = await req.json().catch(() => null);
  const playerId = typeof body?.id === 'string' ? body.id : '';
  if (!playerId) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('id', playerId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!player) return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 });

  const { error } = await supabase.from('players').delete().eq('id', playerId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await writeAdminAuditLog(supabase, {
    actor_user_id: guard.user.id,
    target_user_id: userId,
    action: 'player_delete',
    payload: { player_id: playerId },
  });

  return NextResponse.json({ ok: true });
}
