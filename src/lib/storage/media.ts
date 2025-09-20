// src/lib/storage/media.ts
import { supabase } from '@/lib/supabase/client';

/**
 * Sube un fichero al bucket "match-media" dentro de la carpeta {userId}/
 * Devuelve la ruta y una URL firmada (1 hora).
 * OJO: úsalo desde componentes cliente (o pásale el userId).
 */
export async function uploadToMatchMediaBucket(file: File, userId?: string) {
  const uid = userId ?? (await supabase.auth.getUser()).data.user?.id;
  if (!uid) throw new Error('No hay sesión de usuario.');

  const safeName = file.name.replace(/\s+/g, '_');
  const path = `${uid}/${crypto.randomUUID()}_${safeName}`;

  const { error: upErr } = await supabase
    .storage
    .from('match-media')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    });

  if (upErr) throw upErr;

  const { data: signed, error: signErr } = await supabase
    .storage
    .from('match-media')
    .createSignedUrl(path, 60 * 60);

  if (signErr) throw signErr;

  return { path, signedUrl: signed.signedUrl };
}

/**
 * Inserta un registro en la tabla match_media para vincular el archivo a un partido/jugador.
 * Requiere matchId (tu esquema lo marca NOT NULL).
 */
export async function createMatchMediaRecord(opts: {
  matchId: string;
  path: string;
  playerId?: string | null;
  mimeType?: string;
  sizeBytes?: number;
  takenAt?: Date;
  kind?: 'photo' | 'video' | 'file';
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No hay sesión de usuario.');

  const kind =
    opts.kind ??
    (opts.mimeType?.startsWith('image/')
      ? 'photo'
      : opts.mimeType?.startsWith('video/')
      ? 'video'
      : 'file');

  const { error } = await supabase.from('match_media').insert({
    user_id: user.id,
    match_id: opts.matchId,
    player_id: opts.playerId ?? null,
    kind,
    storage_path: opts.path,
    mime_type: opts.mimeType ?? null,
    size_bytes: opts.sizeBytes ?? null,
    taken_at: opts.takenAt ?? null,
  });

  if (error) throw error;
}

/** Lista tus archivos del bucket bajo {uid}/ */
export async function listMyMedia() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No hay sesión de usuario.');

  const { data, error } = await supabase
    .storage
    .from('match-media')
    .list(`${user.id}/`, {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' },
    });

  if (error) throw error;
  return data ?? [];
}

/** Borra por ruta completa dentro del bucket */
export async function deleteMedia(path: string) {
  const { error } = await supabase.storage.from('match-media').remove([path]);
  if (error) throw error;
}
