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
    CONTACT: '/contact',
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
    CLUB_NAME_MAX: 80,
    TEAM_NAME_MAX: 60,
} as const;

export const LEGAL_CONSTANTS = {
    company: {
        name: process.env.NEXT_PUBLIC_COMPANY_NAME ?? '{{company_name}}',
        nif: process.env.NEXT_PUBLIC_COMPANY_NIF ?? '{{company_nif}}',
        address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS ?? '{{company_address}}',
        country: process.env.NEXT_PUBLIC_COMPANY_COUNTRY ?? 'España',
        email: process.env.NEXT_PUBLIC_COMPANY_EMAIL ?? '{{company_email}}',
        phone: process.env.NEXT_PUBLIC_COMPANY_PHONE ?? '',
        reg_merc: process.env.NEXT_PUBLIC_COMPANY_RM ?? ''
    },
    legal: {
        jurisdiction: 'España',
        dpo_email: '',
        data_subject_email: process.env.NEXT_PUBLIC_PRIVACY_EMAIL ?? '{{privacy_email}}'
    },
    product: {
        app_name: process.env.NEXT_PUBLIC_APP_NAME ?? 'DeporTeen',
        domain: process.env.NEXT_PUBLIC_APP_DOMAIN ?? '{{app_domain}}'
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
