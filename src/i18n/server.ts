// src/i18n/server.ts
import { getDictionary, makeT } from './dictionary';
import { I18N_DEFAULTS } from '@/config/constants';
import { DEFAULT_LOCALE, isSupportedLocale, Locale } from './config';

export async function tServer(rawLocale?: string) {
  const locale: Locale = isSupportedLocale(rawLocale) ? (rawLocale as Locale) : DEFAULT_LOCALE;
  const { dict } = await getDictionary(locale);
  const base = makeT(dict);
  const t = (key: string, vars?: Record<string, any>) => base(key, { ...I18N_DEFAULTS, ...vars });
  return { t, locale, dict };
}
