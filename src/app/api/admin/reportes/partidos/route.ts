import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/adminGuard';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')
    ),
  ];
  return lines.join('\n');
}

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const supabase = getSupabaseAdmin();
  const { data: matches } = await supabase
    .from('matches')
    .select('id, user_id, rival_team_name, my_score, rival_score, place, date_at, notes, created_at')
    .order('created_at', { ascending: false });

  const rows = (matches ?? []).map((m) => ({
    id: m.id,
    user_id: m.user_id,
    rival: m.rival_team_name ?? '',
    my_score: m.my_score ?? '',
    rival_score: m.rival_score ?? '',
    place: m.place ?? '',
    date_at: m.date_at ?? '',
    notes: m.notes ?? '',
    created_at: m.created_at,
  }));

  const csv = toCSV(rows);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="partidos.csv"',
    },
  });
}
