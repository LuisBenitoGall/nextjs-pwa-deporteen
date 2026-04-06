import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/adminGuard';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('storage_subscriptions')
    .select(`
      *,
      plan:storage_plans(id, name, gb_amount, amount_cents, currency)
    `)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with profile info
  const userIds = [...new Set(data?.map((s) => s.user_id) ?? [])];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, full_name')
    .in('id', userIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

  const subscriptions = (data ?? []).map((s) => ({
    ...s,
    profile: profileMap.get(s.user_id) ?? null,
  }));

  return NextResponse.json({ subscriptions });
}

export async function PATCH(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await req.json();
  const { id, status, current_period_end, gb_amount, plan_id } = body;
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status !== undefined) update.status = status;
  if (current_period_end !== undefined) update.current_period_end = current_period_end;
  if (gb_amount !== undefined) update.gb_amount = Number(gb_amount);
  if (plan_id !== undefined) update.plan_id = plan_id;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('storage_subscriptions')
    .update(update)
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('storage_subscriptions')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
