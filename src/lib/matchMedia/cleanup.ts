import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getR2Bucket, getR2Client } from '@/lib/r2/client';
import { decryptToken, getDriveConnection, refreshGoogleAccessToken } from '@/lib/googleDrive/server';

type MediaRow = { id: string; storage_path: string | null };

async function deleteStorageObject(
  supabase: SupabaseClient,
  userId: string,
  storagePath: string | null
): Promise<void> {
  if (!storagePath) return;

  if (storagePath.startsWith('r2:')) {
    try {
      const r2 = getR2Client();
      await r2.send(
        new DeleteObjectCommand({
          Bucket: getR2Bucket(),
          Key: storagePath.slice(3),
        })
      );
    } catch (err) {
      console.error('[matchMedia cleanup] R2 delete failed', err);
    }
    return;
  }

  if (storagePath.startsWith('drive:')) {
    try {
      const conn = await getDriveConnection(userId);
      if (conn?.refresh_token_encrypted) {
        const access = await refreshGoogleAccessToken(decryptToken(conn.refresh_token_encrypted));
        await fetch(
          `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(storagePath.slice(6))}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${access.access_token}` },
          }
        );
      }
    } catch (err) {
      console.error('[matchMedia cleanup] Drive delete failed', err);
    }
    return;
  }

  try {
    const { error } = await supabase.storage.from('matches').remove([storagePath]);
    if (error) console.error('[matchMedia cleanup] Supabase storage delete failed', error);
  } catch (err) {
    console.error('[matchMedia cleanup] Supabase storage delete failed', err);
  }
}

/** Elimina ficheros en almacenamiento y filas `match_media` asociadas a partidos. */
export async function deleteMatchMediaForMatches(
  supabase: SupabaseClient,
  userId: string,
  matchIds: string[]
): Promise<void> {
  if (!matchIds.length) return;

  const { data: rows, error } = await supabase
    .from('match_media')
    .select('id, storage_path')
    .in('match_id', matchIds)
    .eq('user_id', userId);

  if (error) {
    console.error('[matchMedia cleanup] select failed', error);
    return;
  }

  const media = (rows ?? []) as MediaRow[];
  for (const row of media) {
    await deleteStorageObject(supabase, userId, row.storage_path);
  }

  const { error: delErr } = await supabase
    .from('match_media')
    .delete()
    .in('match_id', matchIds)
    .eq('user_id', userId);

  if (delErr) console.error('[matchMedia cleanup] db delete failed', delErr);
}
