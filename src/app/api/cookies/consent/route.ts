import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(()=>null);
  if (!body?.choices || !body?.consent_version) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? null;
  const ua = req.headers.get('user-agent') ?? null;

  const { data: auth } = await supabase.auth.getUser();
  const user_id = auth?.user?.id ?? null;

  const { error } = await supabase.from('cookie_consents').insert({
    user_id, ip, user_agent: ua,
    consent_version: body.consent_version,
    choices: body.choices,
    device_id: body.device_id ?? null
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
