import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ message: 'Servicio de administración no configurado (falta SUPABASE_SERVICE_ROLE_KEY)' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';
    const metadata = body.metadata || {};

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata
    });

    if (error) {
      // Devuelve más contexto si está disponible
      const anyErr = error as any;
      return NextResponse.json(
        {
          code: anyErr?.code || error.name,
          message: error.message,
          status: anyErr?.status,
          error: anyErr
        },
        { status: 400 }
      );
    }
    return NextResponse.json({ user: data.user }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || 'Error inesperado', error: e }, { status: 500 });
  }
}

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json({ message: 'Servicio de administración no configurado' }, { status: 500 });
  }
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) {
      return NextResponse.json({ code: (error as any)?.code || error.name, message: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, count: data?.users?.length ?? 0 }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || 'Error inesperado' }, { status: 500 });
  }
}
