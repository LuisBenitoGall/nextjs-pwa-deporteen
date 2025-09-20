// src/i18n/dictionary.ts
import { DEFAULT_LOCALE, Locale } from './config';

type Dict = Record<string, any>;

export async function getDictionary(locale?: string): Promise<{ locale: Locale; dict: Dict }> {
  const lc = (locale || DEFAULT_LOCALE) as Locale;
  switch (lc) {
    case 'en': return { locale: lc, dict: (await import('./messages/en.json')).default };
    case 'ca': return { locale: lc, dict: (await import('./messages/ca.json')).default };
    //case 'eu': return { locale: lc, dict: (await import('./messages/eu.json')).default };
    //case 'gl': return { locale: lc, dict: (await import('./messages/gl.json')).default };
    case 'es':
    default:   return { locale: 'es', dict: (await import('./messages/es.json')).default };
  }
}

export function makeT(dict: Dict) {
  return (key: string): string => {
    const val = key.split('.').reduce<any>((acc, k) => (acc == null ? acc : acc[k]), dict);
    return (typeof val === 'string' ? val : key) as string;
  };
}
