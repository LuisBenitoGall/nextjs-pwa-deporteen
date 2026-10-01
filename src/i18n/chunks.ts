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

type LazyChunkLoader = () => Promise<MessagesModule>;

/** Imports estáticos por locale/chunk: rutas dinámicas con template no se empaquetan en producción. */
const LAZY_CHUNK_LOADERS: Record<Locale, Record<I18nLazyChunk, LazyChunkLoader>> = {
  es: {
    legal: () => import('./messages/es/chunks/legal.json'),
    admin: () => import('./messages/es/chunks/admin.json'),
  },
  en: {
    legal: () => import('./messages/en/chunks/legal.json'),
    admin: () => import('./messages/en/chunks/admin.json'),
  },
  ca: {
    legal: () => import('./messages/ca/chunks/legal.json'),
    admin: () => import('./messages/ca/chunks/admin.json'),
  },
  it: {
    legal: () => import('./messages/it/chunks/legal.json'),
    admin: () => import('./messages/it/chunks/admin.json'),
  },
  pt: {
    legal: () => import('./messages/pt/chunks/legal.json'),
    admin: () => import('./messages/pt/chunks/admin.json'),
  },
  eu: {
    legal: () => import('./messages/eu/chunks/legal.json'),
    admin: () => import('./messages/eu/chunks/admin.json'),
  },
  gl: {
    legal: () => import('./messages/gl/chunks/legal.json'),
    admin: () => import('./messages/gl/chunks/admin.json'),
  },
};

export async function importLazyChunk(
  locale: Locale,
  chunk: I18nLazyChunk
): Promise<Record<string, unknown>> {
  const byLocale = LAZY_CHUNK_LOADERS[locale] ?? LAZY_CHUNK_LOADERS.es;
  const mod = await byLocale[chunk]();
  return mod.default;
}
