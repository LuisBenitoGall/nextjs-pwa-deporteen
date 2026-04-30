// src/app/api/r2/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getR2Client, getR2Bucket, getR2PublicUrl } from '@/lib/r2/client';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { guessExt } from '@/lib/uploadMatchMedia';
import { getCloudUsage } from '@/lib/cloud/usage';
import { runWithKeyLock } from '@/lib/cloud/upload-lock';
import {
  getMaxVideoDurationSeconds,
  hasQuotaForUpload,
  isVideoDurationAllowed,
  isVideoSizeAllowed,
  MAX_VIDEO_FILE_BYTES,
} from '@/lib/cloud/guardrails';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    return await runWithKeyLock(user.id, async () => {
      const form = await req.formData();
      const file = form.get('file') as File | null;
      const matchId = form.get('matchId') as string | null;
      const playerId = (form.get('playerId') as string | null) || null;
      const durationRaw = form.get('duration_seconds');
      const durationSeconds =
        durationRaw == null || durationRaw === ''
          ? null
          : Number(durationRaw);

      if (!file) return NextResponse.json({ error: 'Falta el archivo.' }, { status: 400 });
      if (!matchId) return NextResponse.json({ error: 'Falta matchId.' }, { status: 400 });

      const usage = await getCloudUsage(supabase, user.id);
      if (usage.plan_gb <= 0 || usage.bytes_quota <= 0) {
        return NextResponse.json({ error: 'Sin suscripción R2 activa.' }, { status: 403 });
      }

      if (file.type.startsWith('video/')) {
        if (!isVideoSizeAllowed(file.size)) {
          return NextResponse.json(
            { error: 'VIDEO_FILE_TOO_LARGE', code: 'VIDEO_FILE_TOO_LARGE', maxBytes: MAX_VIDEO_FILE_BYTES },
            { status: 413 }
          );
        }
        if (!Number.isFinite(durationSeconds ?? NaN) || (durationSeconds ?? 0) <= 0) {
          return NextResponse.json(
            { error: 'VIDEO_METADATA_UNREADABLE', code: 'VIDEO_METADATA_UNREADABLE' },
            { status: 400 }
          );
        }
        const maxDuration = getMaxVideoDurationSeconds(usage.plan_gb);
        if (!isVideoDurationAllowed(durationSeconds ?? 0, usage.plan_gb)) {
          return NextResponse.json(
            { error: 'VIDEO_DURATION_EXCEEDED', code: 'VIDEO_DURATION_EXCEEDED', maxDurationSeconds: maxDuration },
            { status: 400 }
          );
        }
      }

      if (!hasQuotaForUpload(usage.bytes_used, usage.bytes_quota, file.size)) {
        return NextResponse.json(
          {
            error: 'QUOTA_EXCEEDED',
            code: 'QUOTA_EXCEEDED',
            bytesUsed: usage.bytes_used,
            bytesQuota: usage.bytes_quota,
            bytesRemaining: usage.bytes_remaining,
            fileSize: file.size,
          },
          { status: 409 }
        );
      }

      const mediaId = crypto.randomUUID();
      const ext = guessExt(file.type) || '.bin';
      const key = `${user.id}/matches/${matchId}/${mediaId}${ext}`;

      const buffer = Buffer.from(await file.arrayBuffer());
      const r2 = getR2Client();
      await r2.send(new PutObjectCommand({
        Bucket: getR2Bucket(),
        Key: key,
        Body: buffer,
        ContentType: file.type || 'application/octet-stream',
      }));

      const kind = file.type.startsWith('video/') ? 'video' : 'image';
      const { data: inserted, error: insertError } = await supabase
        .from('match_media')
        .insert({
          user_id: user.id,
          match_id: matchId,
          player_id: playerId,
          kind,
          storage_provider: 'r2',
          storage_path: `r2:${key}`,
          device_uri: null,
          mime_type: file.type || null,
          size_bytes: file.size,
          duration_ms: durationSeconds ? Math.round(durationSeconds * 1000) : null,
          taken_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (insertError) {
        await r2.send(new DeleteObjectCommand({ Bucket: getR2Bucket(), Key: key }));
        return NextResponse.json(
          { error: insertError.message || 'MATCH_MEDIA_INSERT_FAILED', code: 'MATCH_MEDIA_INSERT_FAILED' },
          { status: 500 }
        );
      }

      const publicUrl = `${getR2PublicUrl()}/${key}`;
      return NextResponse.json({ path: key, url: publicUrl, mediaId: inserted.id });
    });

    } catch (err: any) {
        console.error('[R2 upload]', err);
        return NextResponse.json({ error: err?.message || 'Error interno.' }, { status: 500 });
    }
}
