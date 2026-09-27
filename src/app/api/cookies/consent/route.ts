import { NextRequest, NextResponse } from 'next/server';
import {
  buildCookieConsentRow,
  parseCookieConsentPayload,
  truncateUserAgent,
} from '@/lib/cookie-consent';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const payload = parseCookieConsentPayload(body);
  if (!payload) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const ua = truncateUserAgent(req.headers.get('user-agent'));
  const { data: auth } = await supabase.auth.getUser();
  const user_id = auth?.user?.id ?? null;

  const row = buildCookieConsentRow(payload, { user_id, user_agent: ua });

  const { error } = await supabase.from('cookie_consents').insert(row);

  // El consentimiento de cookies no debe romper la UX aunque falle telemetría.
  if (error) {
    console.warn('[cookies/consent] insert failed:', error.message);
    return NextResponse.json({ ok: false, warning: 'consent_not_persisted' });
  }
  return NextResponse.json({ ok: true });
}
