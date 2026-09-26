import { NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabase/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { assertRemoteStorageUploadAllowed } from '@/lib/cloud/remote-access';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const BUCKET = 'match-media';
const SIGNED_URL_EXPIRY = 315_360_000;
const MAX_BYTES = 100 * 1024;

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { user } = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get('file');
  const playerId = String(form.get('playerId') || '');
  const seasonId = String(form.get('seasonId') || '');

  if (!(file instanceof File) || !playerId || !seasonId) {
    return NextResponse.json({ error: 'Payload inválido', code: 'INVALID_PAYLOAD' }, { status: 400 });
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'avatar_formato_invalido', code: 'INVALID_FORMAT' }, { status: 422 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Archivo demasiado grande', code: 'FILE_TOO_LARGE', maxBytes: MAX_BYTES }, { status: 422 });
  }

  const supabase = await createSupabaseServerClient();
  const access = await assertRemoteStorageUploadAllowed(supabase, user.id, file.size);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.message, code: access.code },
      { status: access.status }
    );
  }

  const admin = getSupabaseAdmin();
  const { data: ownedPlayer } = await admin
    .from('players')
    .select('id')
    .eq('id', playerId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!ownedPlayer) {
    return NextResponse.json({ error: 'No autorizado', code: 'FORBIDDEN' }, { status: 403 });
  }

  const ext = file.name.match(/\.[a-z0-9]+$/i)?.[0] || '.jpg';
  const storagePath = `${user.id}/avatars/${playerId}/${seasonId}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await admin.storage.from(BUCKET).upload(storagePath, buffer, {
    upsert: true,
    contentType: file.type,
  });
  if (upErr) {
    return NextResponse.json({ error: upErr.message, code: 'UPLOAD_FAILED' }, { status: 500 });
  }

  const { data: signed, error: signErr } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);
  if (signErr || !signed?.signedUrl) {
    return NextResponse.json({ error: signErr?.message || 'SIGN_FAILED', code: 'SIGN_FAILED' }, { status: 500 });
  }

  return NextResponse.json({ signedUrl: signed.signedUrl, path: storagePath });
}
