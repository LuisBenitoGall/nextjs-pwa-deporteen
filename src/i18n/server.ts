// src/i18n/server.ts
import { cookies } from 'next/headers';
import { getDictionary, makeT } from './dictionary';
import { I18N_DEFAULTS } from '@/config/constants';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  normalizeToAppLocale,
  type Locale,
} from './config';

/**
 * Prioridade: cookie dp_locale (selector no cliente) → locale da BD/perfil → default.
 * Así o contido servidor coincide co header cando o usuario cambia o idioma sen gardar aínda en users.locale.
 */
export async function tServer(rawLocale?: string) {
  const jar = await cookies();
  const fromCookie = normalizeToAppLocale(jar.get(LOCALE_COOKIE_NAME)?.value ?? undefined);
  const fromProfile = normalizeToAppLocale(rawLocale);
  const locale: Locale = fromCookie ?? fromProfile ?? DEFAULT_LOCALE;
  const { dict } = await getDictionary(locale);
  const base = makeT(dict);
  const t = (key: string, vars?: Record<string, any>) => base(key, { ...I18N_DEFAULTS, ...vars });
  return { t, locale, dict };
}
