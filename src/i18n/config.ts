// src/i18n/config.ts
export const SUPPORTED_LOCALES = ['es', 'en', 'ca'] as const;
export type Locale = typeof SUPPORTED_LOCALES[number];
export const DEFAULT_LOCALE: Locale = 'es';

export function isSupportedLocale(v: string | null | undefined): v is Locale {
    return !!v && (SUPPORTED_LOCALES as readonly string[]).includes(v);
}

// Opcional: para construir tus opciones del <Select/>
export const LOCALE_LABELS: Record<Locale, string> = {
    es: 'Castellano',
    en: 'English',
    ca: 'Català',
    //eu: 'Euskara',
    //gl: 'Galego',
};
