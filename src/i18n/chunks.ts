import type { Locale } from './config';

/** Bloques de mensajes cargados bajo demanda (fuera del núcleo). */
export const I18N_LAZY_CHUNKS = ['legal', 'admin'] as const;
export type I18nLazyChunk = (typeof I18N_LAZY_CHUNKS)[number];

/** Tamaño máximo del núcleo en español (bytes UTF-8 del JSON). Revisar si se añaden áreas al núcleo. */
export const CORE_MESSAGES_MAX_BYTES_ES = 40_000;

const ADMIN_STRIPE_IN_CORE = new Set(['stripe_pago_seguro']);

/**
 * Asigna cada clave de primer nivel a núcleo o a un bloque lazy.
 * `legal` (documentos HTML) y el panel Stripe/admin van fuera del núcleo.
 */
export function chunkForTopLevelKey(key: string): 'core' | I18nLazyChunk {
  if (key === 'legal') return 'legal';
  if (key.startsWith('admin_')) return 'admin';
  if (key.startsWith('stripe_') && !ADMIN_STRIPE_IN_CORE.has(key)) return 'admin';
  return 'core';
}

export function splitLocaleMessages(full: Record<string, unknown>): {
  core: Record<string, unknown>;
  chunks: Record<I18nLazyChunk, Record<string, unknown>>;
} {
  const core: Record<string, unknown> = {};
  const chunks: Record<I18nLazyChunk, Record<string, unknown>> = {
    legal: {},
    admin: {},
  };
  for (const [key, value] of Object.entries(full)) {
    const target = chunkForTopLevelKey(key);
    if (target === 'core') core[key] = value;
    else chunks[target][key] = value;
  }
  return { core, chunks };
}

export function mergeLocaleMessages(
  core: Record<string, unknown>,
  chunks: Partial<Record<I18nLazyChunk, Record<string, unknown>>>
): Record<string, unknown> {
  return {
    ...core,
    ...(chunks.legal ?? {}),
    ...(chunks.admin ?? {}),
  };
}

/** Rutas que requieren bloques lazy en servidor y cliente. */
export function lazyChunksForPathname(pathname: string): I18nLazyChunk[] {
  const out: I18nLazyChunk[] = [];
  if (pathname.startsWith('/legal')) out.push('legal');
  if (pathname.startsWith('/admin')) out.push('admin');
  return out;
}

export type MessagesModule = { default: Record<string, unknown> };

export async function importCoreMessages(locale: Locale): Promise<Record<string, unknown>> {
  switch (locale) {
    case 'en':
      return (await import('./messages/en/core.json')).default;
    case 'ca':
      return (await import('./messages/ca/core.json')).default;
    case 'it':
      return (await import('./messages/it/core.json')).default;
    case 'eu':
      return (await import('./messages/eu/core.json')).default;
    case 'gl':
      return (await import('./messages/gl/core.json')).default;
    case 'pt':
      return (await import('./messages/pt/core.json')).default;
    case 'es':
    default:
      return (await import('./messages/es/core.json')).default;
  }
}

export async function importLazyChunk(
  locale: Locale,
  chunk: I18nLazyChunk
): Promise<Record<string, unknown>> {
  const path = `./messages/${locale}/chunks/${chunk}.json`;
  return (await import(/* webpackChunkName: "i18n-[request]" */ path)).default;
}
