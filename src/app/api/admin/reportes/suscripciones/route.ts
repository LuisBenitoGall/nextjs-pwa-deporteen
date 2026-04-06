import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/adminGuard';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`)
        .join(',')
    ),
  ];
  return lines.join('\n');
}

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('storage_subscriptions')
    .select('*, plan:storage_plans(name)')
    .order('created_at', { ascending: false });

  const userIds = [...new Set(data?.map((s) => s.user_id) ?? [])];
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id, full_name, username').in('id', userIds)
    : { data: [] };

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

  const rows = (data ?? []).map((s) => {
    const p = profileMap.get(s.user_id);
    return {
      id: s.id,
      user_id: s.user_id,
      user_email: p?.username ?? '',
      user_name: p?.full_name ?? '',
      plan: (s.plan as { name?: string } | null)?.name ?? '',
      gb_amount: s.gb_amount,
      status: s.status,
      period_start: s.current_period_start,
      period_end: s.current_period_end,
      created_at: s.created_at,
    };
  });

  const csv = toCSV(rows);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="suscripciones.csv"',
    },
  });
}
