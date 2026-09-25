import { NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabase/server';
import { canCreateMatch } from '@/lib/guards/canCreateMatch';

export async function POST(req: Request) {
  const { playerId } = await req.json();
  if (!playerId) {
    return NextResponse.json({ ok: false, reason: 'missing_player' }, { status: 400 });
  }

  const { user } = await getServerUser();
  if (!user) return NextResponse.json({ ok: false, reason: 'unauthenticated' }, { status: 401 });

  const allowed = await canCreateMatch(user.id, playerId);
  return NextResponse.json({ ok: allowed });
}
