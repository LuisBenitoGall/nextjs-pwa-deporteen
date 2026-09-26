const DEFAULT_FALLBACK = '/dashboard';

/**
 * Acepta solo rutas internas relativas (mismo origen). Rechaza URLs absolutas,
 * esquemas (`https:`), barras dobles y caracteres de control.
 */
export function safeNextPath(
  raw: string | null | undefined,
  fallback: string = DEFAULT_FALLBACK
): string {
  if (raw == null || raw === '') return fallback;

  const trimmed = raw.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return fallback;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return fallback;
  if (trimmed.includes('\\') || /[\u0000-\u001F\u007F]/.test(trimmed)) return fallback;

  try {
    const pathOnly = trimmed.split(/[?#]/)[0];
    if (!pathOnly.startsWith('/') || pathOnly.startsWith('//')) return fallback;
  } catch {
    return fallback;
  }

  return trimmed;
}
