import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase/server';
import { getR2Bucket, getR2Client } from '@/lib/r2/client';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await getServerUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: mediaId } = await context.params;
    if (!mediaId) {
      return NextResponse.json({ error: 'mediaId requerido' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: mediaRow } = await supabase
      .from('match_media')
      .select('storage_provider,storage_path')
      .eq('id', mediaId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (mediaRow?.storage_provider === 'r2' && mediaRow.storage_path) {
      const r2 = getR2Client();
      await r2.send(new DeleteObjectCommand({
        Bucket: getR2Bucket(),
        Key: mediaRow.storage_path,
      }));
    }

    const { error } = await supabase
      .from('match_media')
      .delete()
      .eq('id', mediaId)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error inesperado' }, { status: 500 });
  }
}
