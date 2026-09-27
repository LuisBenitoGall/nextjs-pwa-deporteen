import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getMaxVideoDurationSeconds,
  isVideoDurationAllowed,
  isVideoSizeAllowed,
  MAX_VIDEO_FILE_BYTES,
} from '@/lib/cloud/guardrails';
import { getRemoteStorageBackend } from '@/lib/cloud/providers';
import { assertRemoteStorageUploadAllowed } from '@/lib/cloud/remote-access';
import { runWithKeyLock } from '@/lib/cloud/upload-lock';
import { guessExt } from '@/lib/uploadMatchMedia';

export type ProcessRemoteMatchMediaUploadInput = {
  supabase: SupabaseClient;
  userId: string;
  file: File;
  matchId: string;
  playerId?: string | null;
  durationSeconds?: number | null;
  clientMediaId?: string | null;
  deviceUri?: string | null;
};

export type ProcessRemoteMatchMediaUploadResult =
  | { ok: true; mediaId: string; path: string; url?: string; storageProvider: string }
  | { ok: false; status: number; body: Record<string, unknown> };

export async function processRemoteMatchMediaUpload(
  input: ProcessRemoteMatchMediaUploadInput
): Promise<ProcessRemoteMatchMediaUploadResult> {
  const { supabase, userId, file, matchId } = input;

  return runWithKeyLock(userId, async () => {
    const access = await assertRemoteStorageUploadAllowed(supabase, userId, file.size);
    if (!access.ok) {
      const body: Record<string, unknown> = {
        error: access.message,
        code: access.code,
      };
      if (access.code === 'QUOTA_EXCEEDED' && access.usage) {
        body.bytesUsed = access.usage.bytes_used;
        body.bytesQuota = access.usage.bytes_quota;
        body.bytesRemaining = access.usage.bytes_remaining;
        body.fileSize = file.size;
      }
      return { ok: false, status: access.status, body };
    }

    const usage = access.usage;

    if (file.type.startsWith('video/')) {
      if (!isVideoSizeAllowed(file.size)) {
        return {
          ok: false,
          status: 413,
          body: {
            error: 'VIDEO_FILE_TOO_LARGE',
            code: 'VIDEO_FILE_TOO_LARGE',
            maxBytes: MAX_VIDEO_FILE_BYTES,
          },
        };
      }
      const durationSeconds = input.durationSeconds;
      if (!Number.isFinite(durationSeconds ?? NaN) || (durationSeconds ?? 0) <= 0) {
        return {
          ok: false,
          status: 400,
          body: { error: 'VIDEO_METADATA_UNREADABLE', code: 'VIDEO_METADATA_UNREADABLE' },
        };
      }
      const maxDuration = getMaxVideoDurationSeconds(usage.plan_gb);
      if (!isVideoDurationAllowed(durationSeconds ?? 0, usage.plan_gb)) {
        return {
          ok: false,
          status: 400,
          body: {
            error: 'VIDEO_DURATION_EXCEEDED',
            code: 'VIDEO_DURATION_EXCEEDED',
            maxDurationSeconds: maxDuration,
          },
        };
      }
    }

    const mediaId =
      input.clientMediaId && /^[0-9a-f-]{36}$/i.test(input.clientMediaId)
        ? input.clientMediaId
        : crypto.randomUUID();
    const ext = guessExt(file.type) || '.bin';
    const buffer = Buffer.from(await file.arrayBuffer());
    const backend = getRemoteStorageBackend();

    let uploaded;
    try {
      uploaded = await backend.uploadObject({
        userId,
        matchId,
        mediaId,
        body: buffer,
        contentType: file.type || 'application/octet-stream',
        ext,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'REMOTE_UPLOAD_FAILED';
      return {
        ok: false,
        status: 500,
        body: { error: message, code: 'REMOTE_UPLOAD_FAILED' },
      };
    }

    const kind = file.type.startsWith('video/') ? 'video' : 'image';
    const durationSeconds = input.durationSeconds;
    const deviceUri =
      input.deviceUri && input.deviceUri.length <= 256 ? input.deviceUri : `media:${mediaId}`;

    const { data: existingRow } = await supabase
      .from('match_media')
      .select('id')
      .eq('id', mediaId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingRow?.id) {
      const { error: updateError } = await supabase
        .from('match_media')
        .update({
          storage_provider: uploaded.storageProvider,
          storage_path: uploaded.storagePath,
          synced_at: new Date().toISOString(),
          size_bytes: file.size,
          mime_type: file.type || null,
        })
        .eq('id', mediaId)
        .eq('user_id', userId);

      if (updateError) {
        try {
          await backend.deleteObject({ storagePath: uploaded.storagePath });
        } catch {
          /* best effort */
        }
        return {
          ok: false,
          status: 500,
          body: {
            error: updateError.message || 'MATCH_MEDIA_UPDATE_FAILED',
            code: 'MATCH_MEDIA_UPDATE_FAILED',
          },
        };
      }

      return {
        ok: true,
        mediaId,
        path: uploaded.objectKey,
        url: uploaded.publicUrl,
        storageProvider: uploaded.storageProvider,
      };
    }

    const { data: inserted, error: insertError } = await supabase
      .from('match_media')
      .insert({
        id: mediaId,
        user_id: userId,
        match_id: matchId,
        player_id: input.playerId ?? null,
        kind,
        storage_provider: uploaded.storageProvider,
        storage_path: uploaded.storagePath,
        device_uri: deviceUri,
        mime_type: file.type || null,
        size_bytes: file.size,
        duration_ms: durationSeconds ? Math.round(durationSeconds * 1000) : null,
        taken_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      try {
        await backend.deleteObject({ storagePath: uploaded.storagePath });
      } catch {
        /* best effort */
      }
      return {
        ok: false,
        status: 500,
        body: {
          error: insertError.message || 'MATCH_MEDIA_INSERT_FAILED',
          code: 'MATCH_MEDIA_INSERT_FAILED',
        },
      };
    }

    return {
      ok: true,
      mediaId: inserted.id,
      path: uploaded.objectKey,
      url: uploaded.publicUrl,
      storageProvider: uploaded.storageProvider,
    };
  });
}
