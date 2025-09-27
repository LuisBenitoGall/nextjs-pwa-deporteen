// src/app/api/players/update-name/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { playerId, fullName } = await req.json();

    if (!playerId || !fullName || !String(fullName).trim()) {
      return NextResponse.json({ ok: false, message: 'Datos inválidos.' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // Autenticación vía cookie del usuario
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: 'No autenticado.' }, { status: 401 });
    }

    // RLS: el usuario solo puede actualizar sus propios players
    const { data, error } = await supabase
      .from('players')
      .update({ full_name: String(fullName).trim() })
      .eq('id', playerId)
      .select('id')
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
    }
    if (!data) {
      return NextResponse.json({ ok: false, message: 'No se pudo actualizar (RLS o id incorrecto).' }, { status: 403 });
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Error desconocido' }, { status: 500 });
  }
}
