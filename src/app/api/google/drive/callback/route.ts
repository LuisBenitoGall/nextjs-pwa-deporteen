import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getServerUser } from '@/lib/supabase/server';
import {
  clearOAuthStateCookie,
  encryptToken,
  exchangeCodeForTokens,
  readOAuthStateCookie,
} from '@/lib/googleDrive/server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { user } = await getServerUser();
  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieState = await readOAuthStateCookie();
  await clearOAuthStateCookie();

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(new URL('/account?drive=csrf-error', req.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      return NextResponse.redirect(new URL('/account?drive=no-refresh-token', req.url));
    }

    const admin = getSupabaseAdmin();
    const { error } = await admin.from('google_drive_connections').upsert(
      {
        user_id: user.id,
        refresh_token_encrypted: encryptToken(tokens.refresh_token),
        scope: tokens.scope ?? null,
        token_type: tokens.token_type ?? null,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'connected',
        last_error: null,
      },
      { onConflict: 'user_id' }
    );
    if (error) throw error;

    return NextResponse.redirect(new URL('/account?drive=connected', req.url));
  } catch (error: any) {
    return NextResponse.redirect(
      new URL(`/account?drive=error&msg=${encodeURIComponent(error?.message ?? 'oauth-error')}`, req.url)
    );
  }
}
