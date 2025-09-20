// app/api/admin/reindex/route.ts
export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST() {
  // Operaciones que requieren service role (sin RLS)
  const { error } = await supabaseAdmin
    .from('players')
    .update({ flagged: true })
    .gt('score', 9000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
