import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { decryptToken, getDriveConnection } from '@/lib/googleDrive/server';
import { getServerUser } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST() {
  const { user } = await getServerUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const connection = await getDriveConnection(user.id);
  if (connection?.refresh_token_encrypted) {
    try {
      const refreshToken = decryptToken(connection.refresh_token_encrypted);
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, {
        method: 'POST',
      });
    } catch {
      // best effort revoke
    }
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.from('google_drive_connections').delete().eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
