import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import {
  decryptToken,
  getDriveConnection,
  GoogleOAuthError,
  refreshGoogleAccessToken,
} from '@/lib/googleDrive/server';
import { handleDriveOAuthReconnectFailure } from '@/lib/googleDrive/driveUploadReconnect';
import { fetchGoogleWithRetry, isRetryableDriveStatus } from '@/lib/googleDrive/http';
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
  const { data: match } = await admin
    .from('matches')
    .select('id, player_id')
    .eq('id', matchId)
    .maybeSingle();
  if (!match?.player_id) {
    return NextResponse.json({ error: 'No autorizado para este partido' }, { status: 403 });
  }
  const { data: ownedPlayer } = await admin
    .from('players')
    .select('id')
    .eq('id', match.player_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!ownedPlayer) {
    return NextResponse.json({ error: 'No autorizado para este partido' }, { status: 403 });
  }

  const conn = await getDriveConnection(user.id);
  if (!conn?.refresh_token_encrypted) {
    return NextResponse.json({ error: 'Drive desconectado', code: 'reconnect-required' }, { status: 409 });
  }

  try {
    const refreshToken = decryptToken(conn.refresh_token_encrypted);
    let refreshed: { access_token: string };
    try {
      refreshed = await refreshGoogleAccessToken(refreshToken);
    } catch (refreshError) {
      const reconnectPayload = await handleDriveOAuthReconnectFailure(user.id, refreshError);
      if (reconnectPayload) {
        return NextResponse.json(reconnectPayload, { status: 409 });
      }
      throw refreshError;
    }
    const accessToken = refreshed.access_token;

    const metadata = {
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
    };
    const uploadBody = new FormData();
    uploadBody.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    uploadBody.append('file', file);

    const uploadRes = await fetchGoogleWithRetry(
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
      throw new Error(`drive-upload:${uploadRes.status}:${text}`);
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
    if (insertError) {
      await fetchGoogleWithRetry(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(driveFileId)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        },
        { retries: 2 }
      ).catch(() => null);
      throw insertError;
    }

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
  } catch (error: unknown) {
    const reconnectPayload = await handleDriveOAuthReconnectFailure(user.id, error);
    if (reconnectPayload) {
      return NextResponse.json(reconnectPayload, { status: 409 });
    }

    const message =
      error instanceof GoogleOAuthError
        ? error.message
        : String((error as { message?: string })?.message ?? 'Drive upload failed');
    const isTransient = /drive-upload:(408|409|429|500|502|503|504):/.test(message);
    if (isTransient) {
      await admin
        .from('google_drive_connections')
        .update({
          last_error: 'upload:transient-error',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
      return NextResponse.json({ error: 'Error temporal al subir a Drive. Reintenta.' }, { status: 503 });
    }

    const driveStatusMatch = message.match(/drive-upload:(\d+):/);
    const providerStatus = driveStatusMatch ? Number(driveStatusMatch[1]) : null;
    if (providerStatus && isRetryableDriveStatus(providerStatus)) {
      return NextResponse.json({ error: 'Drive temporalmente no disponible' }, { status: 503 });
    }

    return NextResponse.json({ error: message || 'Drive upload failed' }, { status: 500 });
  }
}
