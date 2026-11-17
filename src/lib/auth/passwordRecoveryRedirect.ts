export const PASSWORD_RECOVERY_EXEMPT_PATHS = ['/auth/reset-password', '/auth/callback'] as const;

export function isPasswordRecoveryExemptPath(pathname: string): boolean {
  return (PASSWORD_RECOVERY_EXEMPT_PATHS as readonly string[]).includes(pathname);
}

/** PKCE: `?code=` en cualquier ruta excepto callback y reset-password (p. ej. `/` por redirect_to incorrecto). */
export function shouldRedirectPkceRecovery(pathname: string, hasCode: boolean): boolean {
  if (!hasCode) return false;
  return !isPasswordRecoveryExemptPath(pathname);
}

export function hashIndicatesRecovery(hash: string | null | undefined): boolean {
  if (!hash || hash === '#') return false;
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  try {
    const params = new URLSearchParams(raw);
    return params.get('type') === 'recovery';
  } catch {
    return false;
  }
}

export function buildResetPasswordPath(searchParams: URLSearchParams, hash?: string): string {
  const q = searchParams.toString();
  const query = q ? `?${q}` : '';
  const fragment = hash && hash !== '#' ? (hash.startsWith('#') ? hash : `#${hash}`) : '';
  return `/auth/reset-password${query}${fragment}`;
}

/** Raíz con `code` — redirección server-side en middleware. */
export function shouldMiddlewareRedirectRootRecovery(pathname: string, hasCode: boolean): boolean {
  return pathname === '/' && hasCode;
}