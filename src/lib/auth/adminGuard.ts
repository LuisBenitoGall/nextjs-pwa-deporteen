import 'server-only';
import { NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabase/server';
import { isAdminUser } from './roles';

/**
 * Verifica que el usuario autenticado sea admin.
 * Si no, devuelve una NextResponse con 401/403.
 * Si sí, devuelve { user }.
 */
export async function requireAdmin(): Promise<
  | { ok: true; user: NonNullable<Awaited<ReturnType<typeof getServerUser>>['user']> }
  | { ok: false; response: NextResponse }
> {
  const { user } = await getServerUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'No autenticado' }, { status: 401 }),
    };
  }
  if (!isAdminUser(user)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }),
    };
  }
  return { ok: true, user };
}
