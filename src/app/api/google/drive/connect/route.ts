import { NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabase/server';
import { buildGoogleConnectUrl, createOAuthState, saveOAuthStateCookie } from '@/lib/googleDrive/server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const runId = 'vercel-drive-connect';
  try {
    // #region agent log
    fetch('http://127.0.0.1:7591/ingest/ce72ccef-7017-451c-8968-3b282ff493ff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'c441fc' },
      body: JSON.stringify({
        sessionId: 'c441fc',
        runId,
        hypothesisId: 'H1,H5',
        location: 'src/app/api/google/drive/connect/route.ts:enter',
        message: 'drive connect GET entered',
        data: { nodeEnv: process.env.NODE_ENV ?? 'unknown', vercel: !!process.env.VERCEL },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    const { user } = await getServerUser();

    // #region agent log
    fetch('http://127.0.0.1:7591/ingest/ce72ccef-7017-451c-8968-3b282ff493ff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'c441fc' },
      body: JSON.stringify({
        sessionId: 'c441fc',
        runId,
        hypothesisId: 'H5',
        location: 'src/app/api/google/drive/connect/route.ts:after-auth',
        message: 'drive connect getServerUser done',
        data: { isAuthenticated: !!user },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    console.error(
      JSON.stringify({
        tag: 'DRIVE_CONNECT',
        runId,
        stage: 'after-auth',
        isAuthenticated: !!user,
      })
    );

    if (!user) {
      // Misma origen que la petición (evita desajustes de NEXT_PUBLIC_* en preview/prod).
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const state = createOAuthState();

    // #region agent log
    fetch('http://127.0.0.1:7591/ingest/ce72ccef-7017-451c-8968-3b282ff493ff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'c441fc' },
      body: JSON.stringify({
        sessionId: 'c441fc',
        runId,
        hypothesisId: 'H3',
        location: 'src/app/api/google/drive/connect/route.ts:before-cookie',
        message: 'drive connect before saveOAuthStateCookie',
        data: { stateLen: state.length },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    await saveOAuthStateCookie(state);

    // #region agent log
    fetch('http://127.0.0.1:7591/ingest/ce72ccef-7017-451c-8968-3b282ff493ff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'c441fc' },
      body: JSON.stringify({
        sessionId: 'c441fc',
        runId,
        hypothesisId: 'H1,H2,H4',
        location: 'src/app/api/google/drive/connect/route.ts:before-oauth-url',
        message: 'drive connect before buildGoogleConnectUrl',
        data: {
          hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
          hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
          hasRedirectUri: !!process.env.GOOGLE_DRIVE_REDIRECT_URI,
          hasTokenSecret: !!process.env.GOOGLE_DRIVE_TOKEN_SECRET,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    const googleUrl = buildGoogleConnectUrl(state);

    // #region agent log
    fetch('http://127.0.0.1:7591/ingest/ce72ccef-7017-451c-8968-3b282ff493ff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'c441fc' },
      body: JSON.stringify({
        sessionId: 'c441fc',
        runId,
        hypothesisId: 'H4',
        location: 'src/app/api/google/drive/connect/route.ts:redirect-google',
        message: 'drive connect redirecting to google',
        data: { googleUrlLength: googleUrl.length, googleHost: 'accounts.google.com' },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    console.error(
      JSON.stringify({
        tag: 'DRIVE_CONNECT',
        runId,
        stage: 'redirect-google',
        googleUrlLength: googleUrl.length,
      })
    );

    return NextResponse.redirect(googleUrl);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // #region agent log
    fetch('http://127.0.0.1:7591/ingest/ce72ccef-7017-451c-8968-3b282ff493ff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'c441fc' },
      body: JSON.stringify({
        sessionId: 'c441fc',
        runId,
        hypothesisId: 'H1,H2,H3,H5',
        location: 'src/app/api/google/drive/connect/route.ts:catch',
        message: 'drive connect error',
        data: { errorMessage: msg.slice(0, 200) },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    console.error(JSON.stringify({ tag: 'DRIVE_CONNECT', runId, stage: 'error', errorMessage: msg.slice(0, 500) }));
    return NextResponse.json({ error: 'drive_connect_failed', detail: msg.slice(0, 200) }, { status: 500 });
  }
}
