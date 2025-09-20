import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) return NextResponse.json({ user: null, error: error.message }, { status: 200 });
    return NextResponse.json({ user });
  } catch (e: any) {
    return NextResponse.json({ user: null, error: e?.message || 'unknown' }, { status: 200 });
  }
}
