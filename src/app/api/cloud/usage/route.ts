import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase/server';
import { getCloudUsage } from '@/lib/cloud/usage';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const { user } = await getServerUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = await createSupabaseServerClient();
    const usage = await getCloudUsage(supabase, user.id);

    return NextResponse.json(
      { usage },
      {
        headers: {
          'Cache-Control': 'private, max-age=15, stale-while-revalidate=30',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
