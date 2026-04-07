// Client-safe admin check: only inspects user metadata/permissions.
// Never reads env vars — no emails exposed in the client bundle.
// For the email-based check use isAdminUser() from roles.ts (server-only).
import type { User } from '@supabase/supabase-js';

type UserLike = Pick<User, 'user_metadata' | 'app_metadata'> | null | undefined;

function normalize(value: unknown): string | undefined {
  if (typeof value === 'string') return value.toLowerCase();
  if (Array.isArray(value)) {
    const str = value.find((v) => typeof v === 'string');
    return str ? str.toLowerCase() : undefined;
  }
  return undefined;
}

export function isAdminByMetadata(user: UserLike): boolean {
  if (!user) return false;

  const role = normalize(user.user_metadata?.role ?? user.app_metadata?.role);
  if (role === 'admin') return true;

  const permissions = user.user_metadata?.permissions ?? user.app_metadata?.permissions;
  if (Array.isArray(permissions)) {
    return permissions.some((p) => normalize(p) === 'admin');
  }

  return false;
}
