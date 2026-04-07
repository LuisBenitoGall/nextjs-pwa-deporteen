import type { SupabaseClient, User } from '@supabase/supabase-js';

/** Valor almacenado en public.users.role para acceso al panel de administración. */
export const SUPERADMIN_DB_ROLE = 'Superadmin';

function parseAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? '';
  if (!raw) return [];
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeRole(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t.length ? t.toLowerCase() : undefined;
}

/** Comprueba si el valor en BD corresponde al superadministrador (comparación case-insensitive). */
export function isSuperadminDbRole(role: string | null | undefined): boolean {
  return normalizeRole(role) === 'superadmin';
}

/**
 * Autorización para /admin y APIs /api/admin/*.
 * - Lista de emergencia: ADMIN_EMAILS (mismo formato que antes).
 * - Producción: public.users.role = Superadmin (lectura con cliente de sesión / RLS).
 *
 * No usar metadatos JWT para conceder admin (evita suplantación vía cliente).
 */
export async function userCanAccessAdminPanel(
  supabase: SupabaseClient,
  user: User,
): Promise<boolean> {
  const email = user.email?.toLowerCase();
  if (email && parseAdminEmails().includes(email)) return true;

  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !data) return false;
  const row = data as { role?: string | null };
  return isSuperadminDbRole(row.role ?? null);
}
