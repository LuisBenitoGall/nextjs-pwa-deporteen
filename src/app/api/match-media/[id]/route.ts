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
      .select('storage_provider,storage_path,google_drive_file_id')
      .eq('id', mediaId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!mediaRow) {
      return NextResponse.json({ error: 'Media no encontrado' }, { status: 404 });
    }

    // Delete from R2
    if (mediaRow.storage_provider === 'r2' && mediaRow.storage_path) {
      try {
        const r2 = getR2Client();
        await r2.send(new DeleteObjectCommand({
          Bucket: getR2Bucket(),
          Key: mediaRow.storage_path,
        }));
      } catch (err) {
        console.error('[Delete R2] Error:', err);
        // Continue with DB deletion even if R2 deletion fails
      }
    }

    // Delete from Supabase Storage
    if (mediaRow.storage_provider === 'supabase' && mediaRow.storage_path) {
      try {
        const { error: storageError } = await supabase.storage
          .from('matches')
          .remove([mediaRow.storage_path]);
        if (storageError) {
          console.error('[Delete Supabase Storage] Error:', storageError);
        }
      } catch (err) {
        console.error('[Delete Supabase Storage] Error:', err);
        // Continue with DB deletion even if storage deletion fails
      }
    }

    // Delete from Drive (requires user's access token from sessionStorage)
    // Note: This is a best-effort deletion since we don't have the access token server-side
    // The file will remain in Drive but the reference will be removed from the database
    if (mediaRow.storage_provider === 'drive' && mediaRow.google_drive_file_id) {
      console.log('[Delete Drive] File ID:', mediaRow.google_drive_file_id, '- Deletion skipped (requires client-side token)');
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
