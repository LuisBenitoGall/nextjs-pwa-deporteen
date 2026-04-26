import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getDriveStatus, type StorageProvider } from '@/lib/googleDrive/server';
import { isAllowedProvider, isCrossUserAttempt } from '@/lib/storageProvider/validation';
import { getServerUser } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  const { user } = await getServerUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getSupabaseAdmin();
  const [{ data: preference }, driveStatus] = await Promise.all([
    admin
      .from('media_storage_preferences')
      .select('provider')
      .eq('user_id', user.id)
      .maybeSingle(),
    getDriveStatus(user.id),
  ]);

  return NextResponse.json({
    provider: (preference?.provider as StorageProvider) ?? 'local',
    driveStatus,
  });
}

export async function POST(req: Request) {
  const { user } = await getServerUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { provider?: StorageProvider; userId?: string };
  if (isCrossUserAttempt(user.id, body.userId)) {
    return NextResponse.json({ error: 'Cross-user forbidden' }, { status: 403 });
  }
  if (!isAllowedProvider(body.provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 422 });
  }

  if (body.provider === 'drive') {
    const status = await getDriveStatus(user.id);
    if (status !== 'connected') {
      return NextResponse.json({ error: 'Drive not connected', code: 'reconnect-required' }, { status: 409 });
    }
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.from('media_storage_preferences').upsert(
    { user_id: user.id, provider: body.provider, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, provider: body.provider });
}
