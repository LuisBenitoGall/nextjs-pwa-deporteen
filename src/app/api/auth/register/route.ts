import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const REGISTER_LIMIT = 5;
const REGISTER_WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const { allowed, resetAt } = rateLimit(`register:${ip}`, REGISTER_LIMIT, REGISTER_WINDOW_MS);
  if (!allowed) {
    return NextResponse.json(
      { message: 'Demasiados intentos. Inténtalo de nuevo más tarde.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)) },
      }
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
    emailRedirectTo?: string;
    name?: string;
    surname?: string;
    locale?: string;
    accepted_terms?: boolean;
  };

  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';

  if (!email || !password) {
    return NextResponse.json({ message: 'Email y contraseña requeridos.' }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.json({ message: 'Servicio no configurado.' }, { status: 503 });
  }

  const supabase = createClient(url, anon);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: body.emailRedirectTo,
      data: {
        name: body.name,
        surname: body.surname,
        accepted_terms: body.accepted_terms,
        locale: (body.locale || 'es').slice(0, 2).toLowerCase(),
      },
    },
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({ user: data.user }, { status: 200 });
}
