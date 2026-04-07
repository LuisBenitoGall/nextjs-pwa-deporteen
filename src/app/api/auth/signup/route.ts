import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

// 5 signup attempts per IP per 15 minutes
const SIGNUP_LIMIT = 5;
const SIGNUP_WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const { allowed, resetAt } = rateLimit(`signup:${ip}`, SIGNUP_LIMIT, SIGNUP_WINDOW_MS);
  if (!allowed) {
    return NextResponse.json(
      { message: 'Demasiados intentos. Inténtalo de nuevo más tarde.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)) },
      },
    );
  }

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
