import { NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabase/server';
import { buildGoogleConnectUrl, createOAuthState, saveOAuthStateCookie } from '@/lib/googleDrive/server';

export const runtime = 'nodejs';

export async function GET() {
  const { user } = await getServerUser();
  if (!user) return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'));

  const state = createOAuthState();
  await saveOAuthStateCookie(state);

  return NextResponse.redirect(buildGoogleConnectUrl(state));
}
