import { NextRequest, NextResponse } from 'next/server';
import { cronAuthFailureResponse, isCronAuthorized } from '@/lib/cron/auth';
import { runDailyMaintenanceCron } from '@/lib/cron/daily-maintenance';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Vercel Cron (diario): avisos de caducidad por correo + purga consentimientos cookies. */
export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return cronAuthFailureResponse();

  const result = await runDailyMaintenanceCron();
  const status = result.ok ? 200 : 207;
  return NextResponse.json(result, { status });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
