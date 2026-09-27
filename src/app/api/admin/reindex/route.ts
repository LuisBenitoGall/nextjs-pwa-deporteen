// app/api/admin/reindex/route.ts
export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/adminGuard';

/** Endpoint legacy: columnas `flagged`/`score` no existen en public.players. */
export async function POST() {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return guard.response;
  }

  return NextResponse.json(
    {
      ok: false,
      error: 'Reindex deshabilitado: el esquema actual de players no incluye flagged/score.',
    },
    { status: 501 },
  );
}
