import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/adminGuard';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('storage_plans')
    .select('*')
    .order('gb_amount', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ plans: data ?? [] });
}

export async function PATCH(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await req.json();
  const { id, name, gb_amount, amount_cents, active, stripe_price_id } = body;
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (gb_amount !== undefined) update.gb_amount = Number(gb_amount);
  if (amount_cents !== undefined) update.amount_cents = Number(amount_cents);
  if (active !== undefined) update.active = Boolean(active);
  if (stripe_price_id !== undefined) update.stripe_price_id = stripe_price_id;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('storage_plans').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await req.json();
  const { name, gb_amount, amount_cents, currency, stripe_price_id } = body;

  if (!name || gb_amount == null || amount_cents == null) {
    return NextResponse.json({ error: 'name, gb_amount y amount_cents son requeridos' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('storage_plans')
    .insert({
      name,
      gb_amount: Number(gb_amount),
      amount_cents: Number(amount_cents),
      currency: currency ?? 'eur',
      stripe_price_id: stripe_price_id ?? null,
      active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ plan: data }, { status: 201 });
}

export async function DELETE(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('storage_plans').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
