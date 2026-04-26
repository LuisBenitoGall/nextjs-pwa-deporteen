import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import {
  decryptToken,
  getDriveConnection,
  refreshGoogleAccessToken,
} from '@/lib/googleDrive/server';
import { getServerUser } from '@/lib/supabase/server';

const ALLOWED = ['image/', 'video/'];
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_VIDEO_BYTES = 300 * 1024 * 1024;

export const runtime = 'nodejs';

function isAllowedMime(mime: string) {
  return ALLOWED.some((prefix) => mime.startsWith(prefix));
}

export async function POST(req: Request) {
  const { user } = await getServerUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const form = await req.formData();
  const file = form.get('file');
  const matchId = String(form.get('matchId') || '');
  const playerId = String(form.get('playerId') || '') || null;

  if (!(file instanceof File) || !matchId) {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
  }

  if (!isAllowedMime(file.type || '')) {
    return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 422 });
  }
  const maxBytes = file.type.startsWith('video/') ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > maxBytes) {
    return NextResponse.json({ error: 'Archivo demasiado grande', maxBytes }, { status: 422 });
  }

  const admin = getSupabaseAdmin();
  const { data: ownedMatch } = await admin
    .from('matches')
    .select('id')
    .eq('id', matchId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!ownedMatch) {
    return NextResponse.json({ error: 'No autorizado para este partido' }, { status: 403 });
  }

  const conn = await getDriveConnection(user.id);
  if (!conn?.refresh_token_encrypted) {
    return NextResponse.json({ error: 'Drive desconectado', code: 'reconnect-required' }, { status: 409 });
  }

  try {
    const refreshToken = decryptToken(conn.refresh_token_encrypted);
    const refreshed = await refreshGoogleAccessToken(refreshToken);
    const accessToken = refreshed.access_token;

    const metadata = {
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
    };
    const uploadBody = new FormData();
    uploadBody.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    uploadBody.append('file', file);

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: uploadBody,
      }
    );

    if (!uploadRes.ok) {
      const text = await uploadRes.text();
      if (uploadRes.status === 401 || uploadRes.status === 403) {
        await admin
          .from('google_drive_connections')
          .update({
            status: 'reconnect-required',
            last_error: `upload:${uploadRes.status}`,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
        return NextResponse.json({ error: 'Drive requiere reconexión', code: 'reconnect-required' }, { status: 409 });
      }
      throw new Error(text);
    }

    const { id: driveFileId } = (await uploadRes.json()) as { id?: string };
    if (!driveFileId) throw new Error('Drive no devolvió id');

    const mediaId = crypto.randomUUID();
    const now = new Date().toISOString();
    const { error: insertError } = await admin.from('match_media').insert({
      id: mediaId,
      user_id: user.id,
      match_id: matchId,
      player_id: playerId,
      kind: file.type.startsWith('video/') ? 'video' : 'image',
      storage_provider: 'drive',
      storage_path: `drive:${driveFileId}`,
      google_drive_file_id: driveFileId,
      device_uri: null,
      mime_type: file.type || null,
      size_bytes: file.size,
      synced_at: now,
      taken_at: now,
    });
    if (insertError) throw insertError;

    await admin
      .from('google_drive_connections')
      .update({
        status: 'connected',
        last_error: null,
        last_refresh_at: now,
        updated_at: now,
      })
      .eq('user_id', user.id);

    return NextResponse.json({ ok: true, mediaId, driveFileId });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Drive upload failed' }, { status: 500 });
  }
}
