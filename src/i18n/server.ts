// src/i18n/server.ts
import { getDictionary, makeT } from './dictionary';
import { DEFAULT_LOCALE, isSupportedLocale, Locale } from './config';

export async function tServer(rawLocale?: string) {
  const locale: Locale = isSupportedLocale(rawLocale) ? (rawLocale as Locale) : DEFAULT_LOCALE;
  const { dict } = await getDictionary(locale);
  return { t: makeT(dict), locale, dict };
}
