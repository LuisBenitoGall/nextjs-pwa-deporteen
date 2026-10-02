import { NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabase/server';
import { buildGoogleConnectUrl, createOAuthState, saveOAuthStateCookie } from '@/lib/googleDrive/server';
import { isGoogleDriveEnvError, mapGoogleDriveEnvErrorToResponse } from '@/lib/env/server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { user } = await getServerUser();

    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const state = createOAuthState();
    await saveOAuthStateCookie(state);
    const googleUrl = buildGoogleConnectUrl(state);

    return NextResponse.redirect(googleUrl);
  } catch (e: unknown) {
    if (isGoogleDriveEnvError(e)) {
      const mapped = mapGoogleDriveEnvErrorToResponse(e);
      console.error('[drive/connect]', mapped.body.code);
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[drive/connect]', msg);
    return NextResponse.json({ error: 'drive_connect_failed', detail: msg.slice(0, 200) }, { status: 500 });
  }
}
