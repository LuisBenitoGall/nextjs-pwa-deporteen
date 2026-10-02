import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getDriveStatus, type StorageProvider } from '@/lib/googleDrive/server';
import { isAllowedProvider, isCrossUserAttempt } from '@/lib/storageProvider/validation';
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase/server';
import { hasActiveStorageSubscription } from '@/lib/cloud/has-active-storage-subscription';
import { isBillableRemoteProvider } from '@/lib/cloud/remote-access';

export const runtime = 'nodejs';

export async function GET() {
  const { user } = await getServerUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getSupabaseAdmin();
  const supabase = await createSupabaseServerClient();
  const nowIso = new Date().toISOString();

  const [{ data: preference }, driveStatus, { data: r2Sub }] = await Promise.all([
    admin
      .from('media_storage_preferences')
      .select('provider')
      .eq('user_id', user.id)
      .maybeSingle(),
    getDriveStatus(user.id),
    supabase
      .from('storage_subscriptions')
      .select('gb_amount, status, current_period_end')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gte('current_period_end', nowIso)
      .order('current_period_end', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const r2ExpiresAt = r2Sub?.current_period_end ? new Date(r2Sub.current_period_end) : null;
  const r2Active = Boolean(r2ExpiresAt && r2ExpiresAt > new Date() && (r2Sub?.gb_amount ?? 0) > 0);

  return NextResponse.json({
    provider: (preference?.provider as StorageProvider) ?? 'local',
    driveStatus,
    r2Active,
    r2ExpiresAt: r2ExpiresAt?.toISOString() ?? null,
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

  if (isBillableRemoteProvider(body.provider)) {
    const supabase = await createSupabaseServerClient();
    const active = await hasActiveStorageSubscription(supabase, user.id);
    if (!active) {
      return NextResponse.json(
        {
          error: 'Sin suscripción de almacenamiento remoto activa.',
          code: 'NO_ACTIVE_STORAGE_SUBSCRIPTION',
        },
        { status: 403 }
      );
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
