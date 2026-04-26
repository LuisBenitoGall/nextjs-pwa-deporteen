import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase/server';
import { getR2Bucket, getR2Client } from '@/lib/r2/client';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { decryptToken, getDriveConnection, refreshGoogleAccessToken } from '@/lib/googleDrive/server';

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
      .select('storage_path')
      .eq('id', mediaId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!mediaRow) {
      return NextResponse.json({ error: 'Media no encontrado' }, { status: 404 });
    }

    const storagePath = mediaRow.storage_path as string | null;

    // Delete from R2
    if (storagePath?.startsWith('r2:')) {
      try {
        const r2 = getR2Client();
        await r2.send(new DeleteObjectCommand({
          Bucket: getR2Bucket(),
          Key: storagePath.slice(3),
        }));
      } catch (err) {
        console.error('[Delete R2] Error:', err);
        // Continue with DB deletion even if R2 deletion fails
      }
    }

    // Delete from Supabase Storage
    if (storagePath && !storagePath.startsWith('r2:') && !storagePath.startsWith('drive:')) {
      try {
        const { error: storageError } = await supabase.storage
          .from('matches')
          .remove([storagePath]);
        if (storageError) {
          console.error('[Delete Supabase Storage] Error:', storageError);
        }
      } catch (err) {
        console.error('[Delete Supabase Storage] Error:', err);
        // Continue with DB deletion even if storage deletion fails
      }
    }

    if (storagePath?.startsWith('drive:')) {
      try {
        const conn = await getDriveConnection(user.id);
        if (conn?.refresh_token_encrypted) {
          const access = await refreshGoogleAccessToken(decryptToken(conn.refresh_token_encrypted));
          await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(storagePath.slice(6))}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${access.access_token}` },
          });
        }
      } catch (err) {
        console.error('[Delete Drive] Error:', err);
      }
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
