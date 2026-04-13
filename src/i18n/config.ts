// src/i18n/config.ts
export const SUPPORTED_LOCALES = ['es', 'en', 'ca', 'it', 'eu', 'gl'] as const;
export type Locale = typeof SUPPORTED_LOCALES[number];
export const DEFAULT_LOCALE: Locale = 'es';

/** Cookie que o cliente sincroniza co selector de idioma para que as páxinas servidor usen o mesmo locale que o header */
export const LOCALE_COOKIE_NAME = 'dp_locale';

export function isSupportedLocale(v: string | null | undefined): v is Locale {
    return !!v && (SUPPORTED_LOCALES as readonly string[]).includes(v);
}

/** Normaliza valores tipo "ca-ES", "en_GB" ao código de app (ca, en, …). */
export function normalizeToAppLocale(v: string | null | undefined): Locale | null {
    if (v == null || v === '') return null;
    const base = String(v).trim().split(/[-_]/)[0].toLowerCase();
    return isSupportedLocale(base) ? base : null;
}

/** Etiqueta BCP 47 para Intl.* */
export function intlLocaleTag(lc: Locale): string {
    const m: Record<Locale, string> = {
        es: 'es-ES',
        en: 'en-GB',
        ca: 'ca-ES',
        it: 'it-IT',
        eu: 'eu-ES',
        gl: 'gl-ES',
    };
    return m[lc];
}

// Opcional: para construir tus opciones del <Select/>
export const LOCALE_LABELS: Record<Locale, string> = {
    es: 'Castellano',
    en: 'English',
    ca: 'Català',
    it: 'Italiano',
    eu: 'Euskara',
    gl: 'Galego',
};
