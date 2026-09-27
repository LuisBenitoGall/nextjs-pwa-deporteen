import type { NextRequest } from 'next/server';

/** Comprueba Authorization Bearer o cabecera x-cron-secret (Vercel Cron). */
export function isCronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = req.headers.get('authorization') ?? '';
  if (auth === `Bearer ${secret}`) return true;
  return req.headers.get('x-cron-secret') === secret;
}

export function cronAuthFailureResponse(): Response {
  return Response.json({ error: 'Forbidden' }, { status: 403 });
}
