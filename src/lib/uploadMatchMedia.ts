// src/lib/uploadMatchMedia.ts
import { supabaseBrowser } from '@/lib/supabase/client';
import { idbPut } from '@/lib/mediaLocal';

// Nube OFF por defecto. Actívala poniendo NEXT_PUBLIC_CLOUD_MEDIA=1 en .env.local
const CLOUD_ENABLED = process.env.NEXT_PUBLIC_CLOUD_MEDIA === '1';

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
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user?.id) throw new Error('No autenticado');
  const uid = authData.user.id;

  // Metadatos
  let { width, height, duration_ms } = params;
  if (kind === 'image' && (!width || !height)) {
    const meta = await probeImage(file);
    width = meta.width; height = meta.height;
  } else if (kind === 'video' && (!width || !height || !duration_ms)) {
    const meta = await probeVideo(file);
    width = meta.width; height = meta.height; duration_ms = meta.duration_ms;
  }

  // Identificadores y clave local
  const mediaId = (crypto?.randomUUID?.() ?? `m_${Math.random().toString(36).slice(2)}${Date.now()}`);
  const deviceKey = `media:${mediaId}`;
  const mime = file.type || (kind === 'image' ? 'image/jpeg' : 'video/mp4');

  // 1) Guardar local siempre: sirve como caché inmediata aunque el proveedor sea Drive/Supabase.
  await idbPut(deviceKey, file);

  const requestedProvider = params.provider ?? (CLOUD_ENABLED ? 'supabase' : 'local');

  // R2: la API maneja tanto el upload como el insert en match_media
  if (requestedProvider === 'r2') {
    const form = new FormData();
    form.append('file', file);
    form.append('matchId', matchId);
    if (playerId) form.append('playerId', playerId);
    if (duration_ms != null) form.append('duration_seconds', String(duration_ms / 1000));
    const res = await fetch('/api/r2/upload', { method: 'POST', body: form });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'Error R2' }));
      throw new Error(error || 'No se pudo subir a R2.');
    }
    const { mediaId: r2Id, path } = await res.json() as { mediaId: string; path: string };
    return { id: r2Id, storagePath: path };
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

    await fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    }).catch(() => {
      // La galería puede seguir usando la caché local aunque no se pueda publicar el enlace.
    });

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
      storage_provider: requestedProvider === 'drive' ? 'drive' : requestedProvider === 'supabase' ? 'supabase' : 'local',
      mime_type: mime,
      size_bytes: file.size,
      width, height, duration_ms,
      device_uri: deviceKey,
      storage_path: storagePath,
      google_drive_file_id: capturedDriveFileId,
      synced_at: syncedAt,
      taken_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (insertRes.error) throw new Error(insertRes.error.message || 'No se pudo insertar en match_media');

  // 3) Subida opcional a Supabase Storage (solo si activas el flag o se pide explícitamente)
  if (requestedProvider === 'supabase') {
    const ext = guessExt(mime) || (kind === 'image' ? '.jpg' : '.mp4');
    storagePath = `${uid}/matches/${matchId}/${mediaId}${ext}`;

    const up = await supabase.storage
      .from('matches')
      .upload(storagePath, file, { upsert: true, contentType: mime });

    if (!up.error) {
      await supabase
        .from('match_media')
        .update({ storage_path: storagePath, synced_at: new Date().toISOString() })
        .eq('id', mediaId);
    } else {
      // Si quisieras cola de reintentos, aquí la meterías… pero NO mientras la nube esté desactivada.
      storagePath = null;
    }
  }

  return { id: mediaId, storagePath };
}
