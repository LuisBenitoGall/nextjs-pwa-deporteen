import 'server-only';
import { NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabase/server';
import { createSupabaseServerClientReadOnly } from '@/lib/supabase/server';
import { userCanAccessAdminPanel } from './adminAccess';

/**
 * Verifica que el usuario autenticado pueda acceder al panel /admin (Superadmin en BD o ADMIN_EMAILS).
 * Si no, devuelve 401/403. No confía en metadatos JWT.
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
  const supabase = await createSupabaseServerClientReadOnly();
  const allowed = await userCanAccessAdminPanel(supabase, user);
  if (!allowed) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }),
    };
  }
  return { ok: true, user };
}
