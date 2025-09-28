import { type User } from '@supabase/supabase-js';

function parseAdminEmails(): string[] {
  const raw = process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? process.env.ADMIN_EMAILS ?? '';
  if (!raw) return [];
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function normalize(value: unknown): string | undefined {
  if (typeof value === 'string') return value.toLowerCase();
  if (Array.isArray(value)) {
    const strVal = value.find((item) => typeof item === 'string');
    return strVal ? strVal.toLowerCase() : undefined;
  }
  return undefined;
}

export function isAdminUser(user: User | null | undefined): boolean {
  if (!user) return false;

  const adminEmails = parseAdminEmails();
  const email = user.email?.toLowerCase();
  if (email && adminEmails.includes(email)) return true;

  const role = normalize(user.user_metadata?.role ?? user.app_metadata?.role);
  if (role === 'admin') return true;

  const permissions = user.user_metadata?.permissions;
  if (Array.isArray(permissions)) {
    return permissions.some((perm) => normalize(perm) === 'admin');
  }

  return false;
}
