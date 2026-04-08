import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/adminGuard';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return guard.response;
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
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
  const guard = await requireAdmin();
  if (!guard.ok) {
    return guard.response;
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) {
      return NextResponse.json({ code: (error as any)?.code || error.name, message: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, count: data?.users?.length ?? 0 }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || 'Error inesperado' }, { status: 500 });
  }
}
