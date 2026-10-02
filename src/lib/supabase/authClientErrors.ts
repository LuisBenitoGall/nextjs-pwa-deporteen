/** Errores de navigator.locks / GoTrue cuando varias pestañas o getSession compiten. */
export function isAuthNavigatorLockError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return msg.includes('Lock broken') || msg.includes('navigator.locks');
}

export function friendlyAuthLoadMessage(
  err: unknown,
  fallback = 'No se pudo cargar. Inténtalo de nuevo.'
): string {
  if (isAuthNavigatorLockError(err)) {
    return 'La sesión se está sincronizando. Espera un momento y recarga la página.';
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

/** Reintenta una operación auth breve tras conflicto de lock (p. ej. post-redirect). */
export async function withAuthLockRetry<T>(
  fn: () => Promise<T>,
  opts?: { attempts?: number; delayMs?: number }
): Promise<T> {
  const attempts = opts?.attempts ?? 3;
  const delayMs = opts?.delayMs ?? 280;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (!isAuthNavigatorLockError(e) || i === attempts - 1) throw e;
      await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw lastErr;
}
