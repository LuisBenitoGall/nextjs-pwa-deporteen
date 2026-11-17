/** Base URL canónica del sitio (sin barra final). */
export function normalizeSiteUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/** SITE_URL / APP_URL de entorno; opcional fallback (p. ej. `location.origin` en cliente). */
export function getAuthSiteUrl(fallbackOrigin?: string): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return normalizeSiteUrl(fromEnv);
  if (fallbackOrigin) return normalizeSiteUrl(fallbackOrigin);
  return '';
}

/** URL absoluta para `redirectTo` de recuperación de contraseña. */
export function getPasswordResetRedirectUrl(clientOrigin?: string): string {
  const base = getAuthSiteUrl(clientOrigin);
  if (!base) {
    throw new Error('Missing site URL: set NEXT_PUBLIC_SITE_URL/NEXT_PUBLIC_APP_URL or call from the browser');
  }
  return `${base}/auth/reset-password`;
}