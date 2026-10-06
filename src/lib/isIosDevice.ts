/**
 * Detección best-effort de iOS para ocultar el selector de archivos existentes.
 * No es el contrato del change: el spec solo exige ocultar el control cuando el
 * dispositivo es iOS. Esta heurística mira iPhone, iPad e iPod en el user agent.
 * No cubre de forma fiable un iPad en modo escritorio (el user agent parece un Mac).
 */
export function isIosUserAgent(userAgent: string): boolean {
  return /iPad|iPhone|iPod/.test(userAgent);
}

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return isIosUserAgent(navigator.userAgent || '');
}
