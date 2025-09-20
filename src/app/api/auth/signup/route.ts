import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !anon) {
    return NextResponse.json({ message: 'Missing Supabase env vars' }, { status: 500 });
  }

  const supabase = createClient(url, anon);
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    return NextResponse.json({ code: error.name, message: error.message }, { status: 400 });
  }
  return NextResponse.json({ user: data.user }, { status: 200 });
}
