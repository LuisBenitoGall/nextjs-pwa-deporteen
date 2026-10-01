// src/config/constants.ts
// Constantes compartidas para uso en todo el proyecto (cliente y servidor).
// Mantén este archivo sin dependencias de Node ni de Next.js para que sea isomórfico.

export const APP = {
    DEVELOPERS: 'Luis Benito',
    NAME: 'DeporTeen',
    TAGLINE: 'Tu deporte, tus datos',
} as const;

export const COMPANY = {
    CORPORATE: 'DeporTeen S.L.',
    TRADE_NAME: 'DeporTeen',
    NIF: '',
    COUNTRY: 'España',
    CITY: 'Barcelona',
    ADDRESS: 'C/ Maresme, 175 2º 2ª',
    ZIP: '08020',
    TELF: '600578602',
    NAME: 'DeporTeen SL',
    WEBSITE: 'https://www.deporteen.com',
    PRIVACY_POLICY_URL: 'https://www.deporteen.com/legal/privacidad',
    TERMS_URL: 'https://www.deporteen.com/legal/terminos',
} as const;

export const ROUTES = {
    HOME: '/',
    LOGIN: '/login',
    LOGOUT: '/logout',
    DASHBOARD: '/dashboard',
    ACCOUNT: '/account',
    CONTACT: '/contacto',
} as const;

export const CONTACT = {
    LEGAL_EMAIL: 'legal@deporteen.com',
    SUPPORT_EMAIL: 'soporte@deporteen.com',
} as const;

// Límites y tamaños comunes para inputs/validaciones
export const LIMITS = {
    PLAYER_NAME_MAX: 60,
    COMPETITION_NAME_MAX: 80,
    COMPETITION_NUM_MAX_BY_SEASON: 5,
    /** Partidos visibles inicialmente en listado por competición (MED-14); «Cargar más» suma el mismo paso. */
    MATCH_LIST_PAGE_SIZE: 100,
    /** Tope de filas en listados admin (partidos, jugadores, competiciones). */
    ADMIN_LIST_MAX: 500,
    CLUB_NAME_MAX: 80,
    TEAM_NAME_MAX: 60,
    CHECKOUT_MAX_UNITS: 100,
} as const;

export const LEGAL_CONSTANTS = {
    company: {
        name: process.env.NEXT_PUBLIC_COMPANY_NAME ?? COMPANY.CORPORATE,
        nif: process.env.NEXT_PUBLIC_COMPANY_NIF ?? COMPANY.NIF,
        address:
            process.env.NEXT_PUBLIC_COMPANY_ADDRESS ??
            `${COMPANY.ADDRESS}, ${COMPANY.ZIP} ${COMPANY.CITY}`,
        country: process.env.NEXT_PUBLIC_COMPANY_COUNTRY ?? COMPANY.COUNTRY,
        email: process.env.NEXT_PUBLIC_COMPANY_EMAIL ?? CONTACT.LEGAL_EMAIL,
        phone: process.env.NEXT_PUBLIC_COMPANY_PHONE ?? COMPANY.TELF,
        reg_merc: process.env.NEXT_PUBLIC_COMPANY_RM ?? '',
    },
    legal: {
        jurisdiction: 'España',
        dpo_email: process.env.NEXT_PUBLIC_DPO_EMAIL ?? '',
        data_subject_email: process.env.NEXT_PUBLIC_PRIVACY_EMAIL ?? CONTACT.LEGAL_EMAIL,
    },
    product: {
        app_name: process.env.NEXT_PUBLIC_APP_NAME ?? APP.NAME,
        domain: process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'www.deporteen.com',
    },
    providers: {
        supabase_region: 'UE (Irlanda)',
        stripe_region: 'España/UE',
        hosting: 'Vercel',
        analytics: 'Google Analytics 4'
    },
    cookies: {
        // nombres de cookies típicas; ajusta si cambias
        session: ['sb-access-token', 'sb-refresh-token'],
        stripe: ['__stripe_mid', '__stripe_sid'],
        ga4: ['_ga', '_ga_*']
    }
};


// Valores por defecto que puedes inyectar en las traducciones como placeholders
// Ejemplo en es.json: "bienvenida": "Bienvenido a {APP_NAME}"
// Uso: t('bienvenida', I18N_DEFAULTS)
export const I18N_DEFAULTS = {
    APP_NAME: APP.NAME,
    SUPPORT_EMAIL: CONTACT.SUPPORT_EMAIL,
} as const;

export type AppConstants = typeof APP & typeof ROUTES & typeof CONTACT & typeof LIMITS;

// Días previos al fin de periodo en los que el usuario puede iniciar renovación manual.
export const RENEW_WINDOW_DAYS = 15;

/** Umbrales de aviso in-app antes del fin de periodo (renovación manual, sin cobro automático). */
export const SUBSCRIPTION_EXPIRY_NOTICE_DAYS: readonly number[] = (() => {
  const raw = process.env.NEXT_PUBLIC_SUBSCRIPTION_EXPIRY_NOTICE_DAYS;
  if (!raw?.trim()) return [30, 15, 7, 1];
  const parsed = raw
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  return parsed.length ? [...new Set(parsed)].sort((a, b) => a - b) : [30, 15, 7, 1];
})();

/** Conservación de registros `cookie_consents` (Luis 27/09/2026). */
export const COOKIE_CONSENT_RETENTION_MONTHS = 24;