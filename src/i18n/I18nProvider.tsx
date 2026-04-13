'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { I18N_DEFAULTS } from '@/config/constants';
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_LABELS,
  LOCALE_COOKIE_NAME,
  isSupportedLocale,
  type Locale,
} from './config';
import { getDictionary, makeT } from './dictionary';

const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 ano

function writeLocaleCookie(locale: Locale) {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = `${LOCALE_COOKIE_NAME}=${locale};path=/;max-age=${LOCALE_COOKIE_MAX_AGE};SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

function readLocaleCookie(): string {
  if (typeof document === 'undefined') return '';
  const m = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE_NAME}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : '';
}

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
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [dict, setDict] = useState<Messages>({}); // se carga perezosamente
  const didInitialRefresh = useRef(false);

  // Locale inicial: localStorage -> navegador -> default
  useEffect(() => {
    try {
      const stored = (localStorage.getItem('locale') || '').toLowerCase();
      const browser = (navigator.language || DEFAULT_LOCALE).slice(0, 2).toLowerCase();
      const initial = isSupportedLocale(stored) ? (stored as Locale)
                    : isSupportedLocale(browser) ? (browser as Locale)
                    : DEFAULT_LOCALE;
      setLocaleState(initial);
      const cookieBefore = readLocaleCookie();
      writeLocaleCookie(initial);
      // Refrescar só se a cookie non coincidía co preferido (evita petición extra cando o SSR xa veu a cookie correcta)
      if (!didInitialRefresh.current && initial !== DEFAULT_LOCALE && cookieBefore !== initial) {
        didInitialRefresh.current = true;
        try {
          router.refresh();
        } catch {
          /* ignore */
        }
      }
    } catch {
      setLocaleState(DEFAULT_LOCALE);
      writeLocaleCookie(DEFAULT_LOCALE);
    }
  }, [router]);

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
    } catch {
      /* ignore */
    }
    writeLocaleCookie(newLocale);
    setLocaleState(newLocale);
    try {
      router.refresh();
    } catch {
      /* ignore */
    }
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
