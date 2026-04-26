import { NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabase/server';
import { getDriveStatus } from '@/lib/googleDrive/server';

export const runtime = 'nodejs';

export async function GET() {
  const { user } = await getServerUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const status = await getDriveStatus(user.id);
  return NextResponse.json({ status });
}
