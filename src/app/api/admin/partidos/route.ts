import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/adminGuard';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ matches: data ?? [] });
}

export async function PATCH(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const allowed = ['my_score', 'rival_score', 'notes', 'place', 'rival_team_name', 'date_at'];
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in fields) update[key] = fields[key];
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('matches').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('matches').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
