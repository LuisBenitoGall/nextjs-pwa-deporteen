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
        .map((h) => {
          const val = String(row[h] ?? '').replace(/"/g, '""');
          return `"${val}"`;
        })
        .join(',')
    ),
  ];
  return lines.join('\n');
}

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const supabase = getSupabaseAdmin();
  const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, full_name');

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

  const rows = (authData?.users ?? []).map((u) => {
    const p = profileMap.get(u.id);
    return {
      id: u.id,
      email: u.email ?? '',
      full_name: p?.full_name ?? '',
      username: p?.username ?? '',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? '',
      confirmed: u.confirmed_at ? 'sí' : 'no',
    };
  });

  const csv = toCSV(rows);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="usuarios.csv"',
    },
  });
}
