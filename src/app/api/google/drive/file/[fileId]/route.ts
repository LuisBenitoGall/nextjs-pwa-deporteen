import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import {
  decryptToken,
  getDriveConnection,
  refreshGoogleAccessToken,
} from '@/lib/googleDrive/server';
import { getServerUser } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(req: Request, context: { params: Promise<{ fileId: string }> }) {
  const { user } = await getServerUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { fileId } = await context.params;
  if (!fileId) return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });

  const checkOnly = new URL(req.url).searchParams.get('check') === '1';
  const conn = await getDriveConnection(user.id);
  if (!conn?.refresh_token_encrypted) {
    return NextResponse.json({ available: false, reason: 'disconnected' }, { status: 404 });
  }

  const admin = getSupabaseAdmin();
  try {
    const access = await refreshGoogleAccessToken(decryptToken(conn.refresh_token_encrypted));
    const token = access.access_token;

    if (checkOnly) {
      const checkRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id`,
        { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
      );
      if (!checkRes.ok) {
        if (checkRes.status === 401 || checkRes.status === 403 || checkRes.status === 404) {
          return NextResponse.json({ available: false, reason: `drive:${checkRes.status}` }, { status: 404 });
        }
        return NextResponse.json({ available: false, reason: 'drive-error' }, { status: 500 });
      }
      return NextResponse.json({ available: true });
    }

    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
    );
    if (!driveRes.ok) {
      if (driveRes.status === 401 || driveRes.status === 403 || driveRes.status === 404) {
        await admin
          .from('google_drive_connections')
          .update({
            status: driveRes.status === 404 ? 'connected' : 'reconnect-required',
            last_error: `file:${driveRes.status}`,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
      }
      return NextResponse.json({ error: 'File unavailable' }, { status: 404 });
    }

    const contentType = driveRes.headers.get('content-type') ?? 'application/octet-stream';
    const body = await driveRes.arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (error: any) {
    await admin
      .from('google_drive_connections')
      .update({
        status: 'reconnect-required',
        last_error: error?.message ?? 'refresh-failed',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);
    return NextResponse.json({ error: 'Drive unavailable', code: 'reconnect-required' }, { status: 409 });
  }
}
