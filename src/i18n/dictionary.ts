// src/i18n/dictionary.ts
import { DEFAULT_LOCALE, Locale, normalizeToAppLocale } from './config';

type Dict = Record<string, any>;

export async function getDictionary(locale?: string): Promise<{ locale: Locale; dict: Dict }> {
  const lc = normalizeToAppLocale(locale) ?? DEFAULT_LOCALE;
  switch (lc) {
    case 'en': return { locale: lc, dict: (await import('./messages/en.json')).default };
    case 'ca': return { locale: lc, dict: (await import('./messages/ca.json')).default };
    case 'it': return { locale: lc, dict: (await import('./messages/it.json')).default };
    case 'eu': return { locale: lc, dict: (await import('./messages/eu.json')).default };
    case 'gl': return { locale: lc, dict: (await import('./messages/gl.json')).default };
    case 'pt': return { locale: lc, dict: (await import('./messages/pt.json')).default };
    case 'es':
    default:   return { locale: 'es', dict: (await import('./messages/es.json')).default };
  }
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
