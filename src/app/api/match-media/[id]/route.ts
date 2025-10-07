import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: mediaId } = await context.params;
    if (!mediaId) {
      return NextResponse.json({ error: 'mediaId requerido' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('match_media').delete().eq('id', mediaId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error inesperado' }, { status: 500 });
  }
}
