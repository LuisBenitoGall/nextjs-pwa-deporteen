import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/adminGuard';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { fetchLegacyProfilesByUserIds, legacyProfileMap } from '@/lib/admin/appUsers';

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
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .order('created_at', { ascending: false });

  const userIds = [...new Set(players?.map((p) => p.user_id) ?? [])];
  const profiles = await fetchLegacyProfilesByUserIds(supabase, userIds);
  const profileMap = legacyProfileMap(profiles);

  const rows = (players ?? []).map((p) => {
    const profile = profileMap.get(p.user_id);
    return {
      id: p.id,
      full_name: p.full_name,
      user_id: p.user_id,
      owner_name: profile?.full_name ?? '',
      owner_username: profile?.username ?? '',
      status: p.status ? 'activo' : 'inactivo',
      created_at: p.created_at,
    };
  });

  const csv = toCSV(rows);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="jugadores.csv"',
    },
  });
}
