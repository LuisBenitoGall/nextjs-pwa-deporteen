/**
 * Convierte el valor del campo fecha del formulario de nuevo partido a Date.
 * Acepta datetime-local (YYYY-MM-DDTHH:mm) y formatos habituales en móvil (DD/MM/YYYY, HH:mm).
 */
export function parseDateAtInput(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const localMatch = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(trimmed);
  if (localMatch) {
    const year = Number(localMatch[1]);
    const month = Number(localMatch[2]) - 1;
    const day = Number(localMatch[3]);
    const hours = Number(localMatch[4]);
    const minutes = Number(localMatch[5]);
    const seconds = localMatch[6] ? Number(localMatch[6]) : 0;
    const date = new Date(year, month, day, hours, minutes, seconds);
    if (!Number.isNaN(date.getTime())) return date;
  }

  const esMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,?\s*(\d{1,2}):(\d{2}))?/.exec(trimmed);
  if (esMatch) {
    const day = Number(esMatch[1]);
    const month = Number(esMatch[2]) - 1;
    const year = Number(esMatch[3]);
    const hours = esMatch[4] !== undefined ? Number(esMatch[4]) : 0;
    const minutes = esMatch[5] !== undefined ? Number(esMatch[5]) : 0;
    const date = new Date(year, month, day, hours, minutes, 0);
    if (!Number.isNaN(date.getTime())) return date;
  }

  const fallback = new Date(trimmed);
  if (!Number.isNaN(fallback.getTime())) return fallback;
  return null;
}

export function dateAtInputToIso(raw: string): string | null {
  const date = parseDateAtInput(raw);
  if (!date) return null;
  return date.toISOString();
}
