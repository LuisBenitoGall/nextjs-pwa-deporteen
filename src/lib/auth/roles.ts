import type { User } from '@supabase/supabase-js';

function parseAdminEmails(): string[] {
  const raw = process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '';
  if (!raw) return [];
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function normalize(value: unknown): string | undefined {
  if (typeof value === 'string') return value.toLowerCase();
  if (Array.isArray(value)) {
    const str = value.find((v) => typeof v === 'string');
    return str ? str.toLowerCase() : undefined;
  }
  return undefined;
}

/**
 * Comprueba si el usuario cuenta como administrador por lista de emails (NEXT_PUBLIC_ADMIN_EMAILS)
 * o por metadatos de rol/permisos (legacy). Para autorización en servidor preferir `userCanAccessAdminPanel`.
 */
export function isAdminUser(user: User | null | undefined): boolean {
  if (!user) return false;

  const email = user.email?.toLowerCase();
  if (email && parseAdminEmails().includes(email)) return true;

  const role = normalize(user.user_metadata?.role ?? user.app_metadata?.role);
  if (role === 'admin') return true;

  const permissions = user.user_metadata?.permissions ?? user.app_metadata?.permissions;
  if (Array.isArray(permissions)) {
    return permissions.some((p) => normalize(p) === 'admin');
  }

  return false;
}
