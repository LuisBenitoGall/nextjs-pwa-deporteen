import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/adminGuard';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = [...new Set(data?.map((p) => p.user_id) ?? [])];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, full_name')
    .in('id', userIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);
  const players = (data ?? []).map((p) => ({
    ...p,
    profile: profileMap.get(p.user_id) ?? null,
  }));

  return NextResponse.json({ players });
}

export async function PATCH(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id, name } = await req.json();
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) update.name = name;

  const { error } = await supabase.from('players').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('players').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
