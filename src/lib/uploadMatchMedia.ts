// src/lib/uploadMatchMedia.ts
import { supabaseBrowser } from '@/lib/supabase/client';
import { idbPut } from '@/lib/mediaLocal';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';
import { enqueue } from '@/lib/mediaSync';

/** @deprecated El flag ya no omite la suscripción; solo se usa en builds legacy para telemetría. */
const LEGACY_CLOUD_FLAG = process.env.NEXT_PUBLIC_CLOUD_MEDIA === '1';

const REMOTE_UPLOAD_ENDPOINT = '/api/remote-media/upload';

export function guessExt(mime: string): string {
  if (!mime) return '';
  const m = mime.toLowerCase();
  if (m.includes('jpeg') || m.includes('jpg')) return '.jpg';
  if (m.includes('png'))  return '.png';
  if (m.includes('webp')) return '.webp';
  if (m.includes('gif'))  return '.gif';
  if (m.includes('mp4'))  return '.mp4';
  if (m.includes('quicktime')) return '.mov'; // iOS
  if (m.includes('webm')) return '.webm';
  return '';
}

export function probeImage(blob: Blob): Promise<{ width?: number; height?: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({});
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

export function probeVideo(blob: Blob): Promise<{ duration_ms?: number; width?: number; height?: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : undefined;
      resolve({ duration_ms: duration, width: video.videoWidth || undefined, height: video.videoHeight || undefined });
      URL.revokeObjectURL(url);
    };
    video.onerror = () => {
      resolve({});
      URL.revokeObjectURL(url);
    };
    video.src = url;
  });
}

/**
 * Flujo:
 * 1) Guarda blob en IndexedDB (device_uri)
 * 2) Inserta metadatos en match_media (storage_path NULL, synced_at NULL)
 * 3) (Opcional) Si CLOUD_ENABLED, sube a Storage y actualiza storage_path/synced_at
 */
export async function uploadMatchMedia(params: {
  matchId: string;
  playerId?: string | null;
  file: File;
  kind: 'image' | 'video'; // se re-normaliza por MIME igualmente
  provider?: 'local' | 'supabase' | 'drive' | 'r2';
  googleAccessToken?: string | null;
  width?: number;
  height?: number;
  duration_ms?: number;
}) {
  const { matchId, playerId = null, file } = params;

  // Normaliza kind por MIME por si el llamador se equivoca
  const kind: 'image' | 'video' =
    file.type?.startsWith('video/') ? 'video'
    : file.type?.startsWith('image/') ? 'image'
    : params.kind;

  const supabase = supabaseBrowser();
  const { data: sessionData } = await supabase.auth.getSession();
  let uid = sessionData.session?.user?.id;
  if (!uid) {
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user?.id) throw new Error('No autenticado');
    uid = authData.user.id;
  }

  const requestedProvider = params.provider ?? (LEGACY_CLOUD_FLAG ? 'supabase' : 'local');
  const isLocalProvider = requestedProvider === 'local';

  // Metadatos: en local no bloqueamos el insert; se completan en segundo plano si faltan.
  let { width, height, duration_ms } = params;
  const needsImageProbe = kind === 'image' && (!width || !height);
  const needsVideoProbe = kind === 'video' && (!width || !height || !duration_ms);
  const needsProbe = needsImageProbe || needsVideoProbe;

  const probePromise = needsProbe
    ? (kind === 'image' ? probeImage(file) : probeVideo(file))
    : null;

  // Identificadores y clave local
  const mediaId = (crypto?.randomUUID?.() ?? `m_${Math.random().toString(36).slice(2)}${Date.now()}`);
  const deviceKey = `media:${mediaId}`;
  const mime = file.type || (kind === 'image' ? 'image/jpeg' : 'video/mp4');

  // 1) Guardar local siempre: sirve como caché inmediata aunque el proveedor sea Drive/Supabase.
  await idbPut(deviceKey, file);

  if (!isLocalProvider && probePromise) {
    const meta = await probePromise;
    if (kind === 'image') {
      width = meta.width ?? width;
      height = meta.height ?? height;
    } else {
      const videoMeta = meta as Awaited<ReturnType<typeof probeVideo>>;
      width = videoMeta.width ?? width;
      height = videoMeta.height ?? height;
      duration_ms = videoMeta.duration_ms ?? duration_ms;
    }
  }

  // Remoto facturable (R2 / Supabase): solo vía API con validación en servidor
  if (requestedProvider === 'r2' || requestedProvider === 'supabase') {
    const form = new FormData();
    form.append('file', file);
    form.append('matchId', matchId);
    form.append('mediaId', mediaId);
    form.append('device_uri', deviceKey);
    if (playerId) form.append('playerId', playerId);
    if (duration_ms != null) form.append('duration_seconds', String(duration_ms / 1000));
    const res = await fetchWithTimeout(REMOTE_UPLOAD_ENDPOINT, { method: 'POST', body: form });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({ error: 'Error de almacenamiento remoto' })) as {
        error?: string;
        code?: string;
      };
      const code = payload.code;
      const message = payload.error || payload.code || 'No se pudo subir a la nube.';
      const permanentDenial =
        res.status === 403 ||
        res.status === 409 ||
        code === 'NO_ACTIVE_STORAGE_SUBSCRIPTION' ||
        code === 'QUOTA_EXCEEDED';
      if (!permanentDenial) {
        const ext = guessExt(mime) || (kind === 'image' ? '.jpg' : '.mp4');
        enqueue({
          id: mediaId,
          key: deviceKey,
          matchId,
          ext,
          mime,
          userId: uid,
          playerId,
        });
      }
      throw new Error(message);
    }
    const { mediaId: remoteId, path } = await res.json() as { mediaId: string; path: string };
    return { id: remoteId, storagePath: path };
  }

  let storagePath: string | null = null;
  let syncedAt: string | null = null;
  let capturedDriveFileId: string | null = null;

  if (requestedProvider === 'drive') {
    const accessToken = params.googleAccessToken;
    if (!accessToken) throw new Error('Se requiere autenticación con Google Drive.');

    const metadata = {
      name: file.name || `${mediaId}${guessExt(mime) || ''}`,
      mimeType: mime,
    };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text().catch(() => '');
      throw new Error(`No se pudo subir a Google Drive. ${err}`.trim());
    }

    const { id: driveFileId } = await uploadRes.json() as { id?: string };
    if (!driveFileId) throw new Error('Google Drive no devolvió identificador de archivo.');
    capturedDriveFileId = driveFileId;

    storagePath = `drive:${driveFileId}`;
    syncedAt = new Date().toISOString();

  }

  // 2) Insert en BD con el esquema real de match_media.
  const insertRes = await supabase
    .from('match_media')
    .insert({
      id: mediaId,
      user_id: uid,
      match_id: matchId,
      player_id: playerId,
      kind,
      storage_provider: requestedProvider === 'drive' ? 'drive' : 'local',
      mime_type: mime,
      size_bytes: file.size,
      width: width ?? null,
      height: height ?? null,
      duration_ms: duration_ms ?? null,
      device_uri: deviceKey,
      storage_path: storagePath,
      google_drive_file_id: capturedDriveFileId,
      synced_at: syncedAt,
      taken_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (insertRes.error) throw new Error(insertRes.error.message || 'No se pudo insertar en match_media');

  if (isLocalProvider && probePromise) {
    void probePromise.then(async (meta) => {
      const patch: { width?: number; height?: number; duration_ms?: number } = {};
      if (kind === 'image') {
        if (meta.width) patch.width = meta.width;
        if (meta.height) patch.height = meta.height;
      } else {
        const videoMeta = meta as Awaited<ReturnType<typeof probeVideo>>;
        if (videoMeta.width) patch.width = videoMeta.width;
        if (videoMeta.height) patch.height = videoMeta.height;
        if (videoMeta.duration_ms != null) patch.duration_ms = videoMeta.duration_ms;
      }
      if (Object.keys(patch).length === 0) return;
      await supabase.from('match_media').update(patch).eq('id', mediaId);
    }).catch(() => {});
  }

  return { id: mediaId, storagePath };
}
