'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { I18N_DEFAULTS } from '@/config/constants';
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_LABELS,
  isSupportedLocale,
  type Locale,
} from './config';
import { getDictionary, makeT } from './dictionary';

type Messages = Record<string, any>;

type I18nCtx = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, any>) => string;
  locales: { code: Locale; label: string; disabled?: boolean }[];
};

const I18nContext = createContext<I18nCtx>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (k: string) => k,
  locales: SUPPORTED_LOCALES.map(code => ({ code, label: LOCALE_LABELS[code] })),
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [dict, setDict] = useState<Messages>({}); // se carga perezosamente

  // Locale inicial: localStorage -> navegador -> default
  useEffect(() => {
    try {
      const stored = (localStorage.getItem('locale') || '').toLowerCase();
      const browser = (navigator.language || DEFAULT_LOCALE).slice(0, 2).toLowerCase();
      const initial = isSupportedLocale(stored) ? (stored as Locale)
                    : isSupportedLocale(browser) ? (browser as Locale)
                    : DEFAULT_LOCALE;
      setLocaleState(initial);
    } catch {
      setLocaleState(DEFAULT_LOCALE);
    }
  }, []);

  // Carga del diccionario cuando cambia el locale
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { dict } = await getDictionary(locale);
        if (!cancelled) setDict(dict);
      } catch {
        if (!cancelled) setDict({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const setLocale = (newLocale: Locale) => {
    if (!isSupportedLocale(newLocale)) return;
    try {
      localStorage.setItem('locale', newLocale);
    } catch {}
    setLocaleState(newLocale);
  };

  const t = useMemo(() => {
    const base = makeT(dict);
    return (key: string, vars?: Record<string, any>) => base(key, { ...I18N_DEFAULTS, ...vars });
  }, [dict]);

  const locales = useMemo(
    () => SUPPORTED_LOCALES.map(code => ({ code, label: LOCALE_LABELS[code] })),
    []
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, locales }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export function useLocale() {
    const { locale, setLocale, locales } = useContext(I18nContext);
    return { locale, setLocale, locales };
}

export function useT() {
    return useContext(I18nContext).t;
}
