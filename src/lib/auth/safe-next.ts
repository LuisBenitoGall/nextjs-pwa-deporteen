const DEFAULT_NEXT = '/dashboard';

/**
 * Returns a same-origin path safe for post-login redirects (no open redirect).
 */
export function safeNext(raw: string | null | undefined, fallback = DEFAULT_NEXT): string {
  if (!raw || typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return fallback;
  if (trimmed.includes('://')) return fallback;
  if (trimmed.includes('\\')) return fallback;
  return trimmed;
}
