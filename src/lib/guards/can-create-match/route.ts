// app/api/guards/can-create-match/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { canCreateMatch } from '@/lib/guards/canCreateMatch';

export async function POST(req: Request) {
  const { playerId } = await req.json();
  if (!playerId) return NextResponse.json({ ok: false, reason: 'missing_player' }, { status: 400 });

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set({ name, value, ...options });
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: 'unauthenticated' }, { status: 401 });

  const allowed = await canCreateMatch(user.id, playerId);
  return NextResponse.json({ ok: allowed });
}
