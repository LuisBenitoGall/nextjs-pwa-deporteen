import { NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabase/server';
import { getSeasonYearsFor } from '@/lib/seasons';
import { ensureCurrentSeasonId } from '@/lib/seasons.server';

export async function GET() {
  try {
    const { user } = await getServerUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const seasonId = await ensureCurrentSeasonId();
    const years = getSeasonYearsFor(new Date());

    return NextResponse.json({
      seasonId,
      year_start: years.year_start,
      year_end: years.year_end,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error inesperado';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
