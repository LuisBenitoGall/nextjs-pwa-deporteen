import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { processRemoteMatchMediaUpload } from '@/lib/cloud/remote-upload-service';

export const runtime = 'nodejs';

/**
 * Punto de entrada canónico para subidas remotas facturables (sustituye atajos cliente → Storage).
 * El backend físico se elige con REMOTE_STORAGE_BACKEND.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado.', code: 'UNAUTHORIZED' }, { status: 401 });

    const form = await req.formData();
    const file = form.get('file') as File | null;
    const matchId = form.get('matchId') as string | null;
    const playerId = (form.get('playerId') as string | null) || null;
    const durationRaw = form.get('duration_seconds');
    const durationSeconds =
      durationRaw == null || durationRaw === '' ? null : Number(durationRaw);
    const clientMediaId = (form.get('mediaId') as string | null)?.trim() || null;
    const deviceUri = (form.get('device_uri') as string | null)?.trim() || null;

    if (!file) return NextResponse.json({ error: 'Falta el archivo.', code: 'INVALID_PAYLOAD' }, { status: 400 });
    if (!matchId) return NextResponse.json({ error: 'Falta matchId.', code: 'INVALID_PAYLOAD' }, { status: 400 });

    const result = await processRemoteMatchMediaUpload({
      supabase,
      userId: user.id,
      file,
      matchId,
      playerId,
      durationSeconds,
      clientMediaId,
      deviceUri,
    });

    if (!result.ok) {
      return NextResponse.json(result.body, { status: result.status });
    }

    return NextResponse.json({
      path: result.path,
      url: result.url,
      mediaId: result.mediaId,
      storageProvider: result.storageProvider,
    });
  } catch (err: unknown) {
    console.error('[remote-media upload]', err);
    const message = err instanceof Error ? err.message : 'Error interno.';
    return NextResponse.json({ error: message, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
