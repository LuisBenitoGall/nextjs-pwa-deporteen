import type { SupabaseClient } from '@supabase/supabase-js';
import { idbGet } from '@/lib/mediaLocal';
import { resolveDriveMediaSource } from '@/lib/googleDrive/mediaResolution';

export type MediaSourceRow = {
  id: string;
  storage_path: string | null;
  google_drive_file_id: string | null;
  device_uri: string | null;
};

export type ResolveMediaSourcesOptions = {
  /** Llamado por cada ítem resuelto (p. ej. para pintar thumbnails progresivamente). */
  onItem?: (item: { id: string; src: string; blobUrl?: string }) => void;
  /** Solo re-firmar rutas Supabase Storage (p. ej. al recuperar foco). */
  supabaseSignedUrlsOnly?: boolean;
};

export type ResolveMediaSourcesResult = {
  urls: Record<string, string>;
  blobUrls: string[];
  unavailable: Record<string, string>;
};

const DEFAULT_CONCURRENCY = 8;

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) break;
      results[i] = await fn(items[i]);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

function driveFileIdFromRow(m: MediaSourceRow): string | null {
  return (
    m.google_drive_file_id ??
    (m.storage_path?.startsWith('drive:') ? m.storage_path.slice(6) : null)
  );
}

function r2PublicUrl(storagePath: string): string | null {
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, '');
  if (!base || !storagePath.startsWith('r2:')) return null;
  return `${base}/${storagePath.slice(3)}`;
}

function isSupabaseStoragePath(storagePath: string | null): boolean {
  if (!storagePath) return false;
  return !storagePath.startsWith('r2:') && !storagePath.startsWith('drive:');
}

async function resolveOne(
  m: MediaSourceRow,
  supabase: SupabaseClient,
  unavailableLabel: string,
  opts?: ResolveMediaSourcesOptions,
): Promise<{ id: string; src?: string; blobUrl?: string; unavailable?: string }> {
  const driveFileId = driveFileIdFromRow(m);
  const isDrive = !!driveFileId;

  if (opts?.supabaseSignedUrlsOnly) {
    if (!isSupabaseStoragePath(m.storage_path)) return { id: m.id };
    const { data, error } = await supabase.storage
      .from('matches')
      .createSignedUrl(m.storage_path!, 60 * 60);
    if (!error && data?.signedUrl) return { id: m.id, src: data.signedUrl };
    return { id: m.id, unavailable: unavailableLabel };
  }

  if (!isDrive && m.device_uri) {
    const blob = await idbGet(m.device_uri);
    if (blob) {
      const u = URL.createObjectURL(blob);
      return { id: m.id, src: u, blobUrl: u };
    }
  }

  if (m.storage_path?.startsWith('r2:')) {
    const publicUrl = r2PublicUrl(m.storage_path);
    if (publicUrl) return { id: m.id, src: publicUrl };
  } else if (isDrive && driveFileId) {
    const result = await resolveDriveMediaSource(driveFileId);
    if (result.available) return { id: m.id, src: result.src };
    return { id: m.id, unavailable: unavailableLabel };
  } else if (isSupabaseStoragePath(m.storage_path)) {
    const { data, error } = await supabase.storage
      .from('matches')
      .createSignedUrl(m.storage_path!, 60 * 60);
    if (!error && data?.signedUrl) return { id: m.id, src: data.signedUrl };
  }

  return { id: m.id, unavailable: unavailableLabel };
}

/**
 * Resuelve URLs de vista previa para filas de match_media en paralelo (IDB, R2, Drive, Supabase).
 */
export async function resolveMatchMediaSources(
  items: MediaSourceRow[],
  supabase: SupabaseClient,
  unavailableLabel: string,
  opts?: ResolveMediaSourcesOptions,
): Promise<ResolveMediaSourcesResult> {
  const urls: Record<string, string> = {};
  const blobUrls: string[] = [];
  const unavailable: Record<string, string> = {};

  const resolved = await runWithConcurrency(items, DEFAULT_CONCURRENCY, (m) =>
    resolveOne(m, supabase, unavailableLabel, opts),
  );

  for (const row of resolved) {
    if (row.src) {
      urls[row.id] = row.src;
      if (row.blobUrl) blobUrls.push(row.blobUrl);
      opts?.onItem?.({ id: row.id, src: row.src, blobUrl: row.blobUrl });
    } else if (row.unavailable) {
      unavailable[row.id] = row.unavailable;
    }
  }

  return { urls, blobUrls, unavailable };
}

export { isSupabaseStoragePath };
