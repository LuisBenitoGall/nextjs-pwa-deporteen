// src/config/constants.ts
// Constantes compartidas para uso en todo el proyecto (cliente y servidor).
// Mantén este archivo sin dependencias de Node ni de Next.js para que sea isomórfico.

export const APP = {
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
    TELF: '',
    NAME: 'DeporTeen SL',
    WEBSITE: 'https://www.deporteen.com',
    PRIVACY_POLICY_URL: 'https://www.deporteen.com/politica-de-privacidad',
    TERMS_URL: 'https://www.deporteen.com/terminos-y-condiciones',
} as const;

export const ROUTES = {
    HOME: '/',
    LOGIN: '/login',
    LOGOUT: '/logout',
    DASHBOARD: '/dashboard',
    SUBSCRIPTION: '/subscription',
    PLAYERS_NEW: '/players/new',
} as const;

export const CONTACT = {
    LEGAL_EMAIL: 'legal@deporteen.com',
    SUPPORT_EMAIL: 'soporte@deporteen.com',
} as const;

// Límites y tamaños comunes para inputs/validaciones
export const LIMITS = {
    PLAYER_NAME_MAX: 60,
    COMPETITION_NAME_MAX: 80,
    CLUB_NAME_MAX: 80,
    TEAM_NAME_MAX: 60,
} as const;

// Valores por defecto que puedes inyectar en las traducciones como placeholders
// Ejemplo en es.json: "bienvenida": "Bienvenido a {APP_NAME}"
// Uso: t('bienvenida', I18N_DEFAULTS)
export const I18N_DEFAULTS = {
    APP_NAME: APP.NAME,
    SUPPORT_EMAIL: CONTACT.SUPPORT_EMAIL,
} as const;

export type AppConstants = typeof APP & typeof ROUTES & typeof CONTACT & typeof LIMITS;
