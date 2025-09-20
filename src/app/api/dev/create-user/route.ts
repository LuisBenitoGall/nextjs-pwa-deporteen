import 'server-only';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  // ATENCIÓN: service role, nunca en el cliente
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { email, password, name = '', surname = '', locale = 'es',
          accepted_terms = true, accepted_marketing = false } = await req.json();

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // que quede verificado para poder loguear ya
    user_metadata: { name, surname, locale, accepted_terms, accepted_marketing }
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ user: data.user }, { status: 201 });
}

export async function GET() {
  // No expongas las claves. Solo comprobamos que existen y tienen pinta de reales.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  return NextResponse.json({
    url_ok: /^https?:\/\/.+/.test(url),
    anon_ok: anon.length > 30,
    service_ok: service.length > 30
  });
}