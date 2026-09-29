// src/i18n/dictionary.ts
import { DEFAULT_LOCALE, Locale, normalizeToAppLocale } from './config';
import {
  type I18nLazyChunk,
  importCoreMessages,
  importLazyChunk,
  mergeLocaleMessages,
} from './chunks';

type Dict = Record<string, any>;

export type GetDictionaryOptions = {
  chunks?: I18nLazyChunk[];
};

async function loadChunks(locale: Locale, chunks: I18nLazyChunk[]): Promise<Dict> {
  const parts: Partial<Record<I18nLazyChunk, Dict>> = {};
  for (const chunk of chunks) {
    parts[chunk] = await importLazyChunk(locale, chunk);
  }
  const core = await importCoreMessages(locale);
  return mergeLocaleMessages(core, parts) as Dict;
}

export async function getDictionary(
  locale?: string,
  options?: GetDictionaryOptions
): Promise<{ locale: Locale; dict: Dict }> {
  const lc = normalizeToAppLocale(locale) ?? DEFAULT_LOCALE;
  const chunks = options?.chunks ?? [];
  if (chunks.length === 0) {
    const dict = await importCoreMessages(lc);
    return { locale: lc, dict };
  }
  const dict = await loadChunks(lc, [...new Set(chunks)]);
  return { locale: lc, dict };
}

// Admite marcadores en mayúsculas ({DAYS}) y en minúsculas ({n}); ambos conviven en los
// mensajes. Los {{...}} de los textos legales quedan intactos: el marcador interior no
// está en `vars`, así que se devuelve tal cual y los consume `LegalDoc.applyPlaceholders`.
const PLACEHOLDER_RE = /\{([A-Za-z0-9_.\-]+)\}/g;

function interpolate(template: string, vars?: Record<string, any>): string {
  if (!vars) return template;
  return template.replace(PLACEHOLDER_RE, (_, k: string) => {
    const v = vars[k];
    return v == null ? `{${k}}` : String(v);
  });
}

export function makeT(dict: Dict) {
  return (key: string, vars?: Record<string, any>): string | undefined => {
    const val = key.split('.').reduce<any>((acc, k) => (acc == null ? acc : acc[k]), dict);
    if (typeof val === 'string') return interpolate(val, vars);
    return undefined;
  };
}
