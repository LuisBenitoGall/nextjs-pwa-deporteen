// src/lib/uploadMatchMedia.ts
import { supabaseBrowser } from '@/lib/supabase/client';
import { idbPut } from '@/lib/mediaLocal';
import { enqueue, trySyncAll } from '@/lib/mediaSync';

export function guessExt(mime: string): string {
  if (!mime) return '';
  const m = mime.toLowerCase();
  if (m.includes('jpeg') || m.includes('jpg')) return '.jpg';
  if (m.includes('png'))  return '.png';
  if (m.includes('webp')) return '.webp';
  if (m.includes('gif'))  return '.gif';
  if (m.includes('mp4'))  return '.mp4';
  if (m.includes('quicktime')) return '.mov'; // iOS Safari
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
 * Sube un medio de partido:
 * - Guarda en IndexedDB
 * - Inserta en match_media
 * - Sube a Storage (bucket 'matches') con prefijo auth.uid()
 * - Actualiza storage_path + synced_at
 */
export async function uploadMatchMedia(params: {
  matchId: string;
  playerId?: string | null;
  file: File;
  kind: 'image' | 'video';
  // Si no pasas metadatos, los calculo yo
  width?: number;
  height?: number;
  duration_ms?: number;
}) {
  const { matchId, playerId = null, file, kind } = params;
  let { width, height, duration_ms } = params;

  const supabase = supabaseBrowser();
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user?.id) throw new Error('No autenticado');
  const uid = authData.user.id;

  const mime = file.type || (kind === 'image' ? 'image/jpeg' : 'video/mp4');
  const ext  = guessExt(mime) || (kind === 'image' ? '.jpg' : '.mp4');
  const mediaId = (crypto?.randomUUID?.() ?? `m_${Math.random().toString(36).slice(2)}${Date.now()}`);
  const deviceKey = `media:${mediaId}`;

  // Metadatos si faltan
  if (kind === 'image' && (!width || !height)) {
    const meta = await probeImage(file);
    width = meta.width; height = meta.height;
  } else if (kind === 'video' && (!width || !height || !duration_ms)) {
    const meta = await probeVideo(file);
    width = meta.width; height = meta.height; duration_ms = meta.duration_ms;
  }

  // 1) Guardar local
  await idbPut(deviceKey, file);

  // 2) Insert en BD
  const ins = await supabase
    .from('match_media')
    .insert({
      id: mediaId,
      match_id: matchId,
      player_id: playerId,
      kind,
      mime_type: mime,
      size_bytes: file.size,
      width, height, duration_ms,
      device_uri: deviceKey,
      storage_path: null,
      synced_at: null,
      taken_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (ins.error) throw new Error(ins.error.message || 'No se pudo insertar en match_media');

  // 3) Sube a Storage con prefijo obligatorio
  const storagePath = `${uid}/matches/${matchId}/${mediaId}${ext}`;
  const up = await supabase.storage.from('matches').upload(storagePath, file, { upsert: true, contentType: mime });

  if (!up.error) {
    await supabase
      .from('match_media')
      .update({ storage_path: storagePath, synced_at: new Date().toISOString() })
      .eq('id', mediaId);
  } else {
    // Encola para reintentar
    enqueue({ id: mediaId, key: deviceKey, matchId, ext, mime });
    try { await trySyncAll(); } catch {}
  }

  if (navigator.onLine) { try { await trySyncAll(); } catch {} }

  return { id: mediaId, storagePath };
}
