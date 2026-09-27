import type { ConsentChoices } from '@/lib/consent';
import type { Database } from '@/lib/database.types';
import { COOKIE_CONSENT_RETENTION_MONTHS } from '@/config/constants';

export type CookieConsentInsert = Database['public']['Tables']['cookie_consents']['Insert'];

export type CookieConsentPayload = {
  consent_version: string;
  choices: ConsentChoices;
  device_id?: string | null;
};

const CONSENT_VERSION_MAX = 32;
const DEVICE_ID_MAX = 128;
const USER_AGENT_MAX = 512;

function isBool(v: unknown): v is boolean {
  return typeof v === 'boolean';
}

export function parseConsentChoices(raw: unknown): ConsentChoices | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.necesarias !== true) return null;
  if (!isBool(o.analitica) || !isBool(o.funcionales) || !isBool(o.marketing)) return null;
  return {
    necesarias: true,
    analitica: o.analitica,
    funcionales: o.funcionales,
    marketing: o.marketing,
  };
}

export function parseCookieConsentPayload(body: unknown): CookieConsentPayload | null {
  if (!body || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  const consent_version = typeof o.consent_version === 'string' ? o.consent_version.trim() : '';
  if (!consent_version || consent_version.length > CONSENT_VERSION_MAX) return null;
  const choices = parseConsentChoices(o.choices);
  if (!choices) return null;
  let device_id: string | null | undefined;
  if (o.device_id === undefined || o.device_id === null) {
    device_id = o.device_id ?? null;
  } else if (typeof o.device_id === 'string') {
    const trimmed = o.device_id.trim();
    device_id = trimmed.length > 0 && trimmed.length <= DEVICE_ID_MAX ? trimmed : null;
  } else {
    return null;
  }
  return { consent_version, choices, device_id };
}

export function truncateUserAgent(ua: string | null): string | null {
  if (!ua) return null;
  const t = ua.trim();
  if (!t) return null;
  return t.length <= USER_AGENT_MAX ? t : t.slice(0, USER_AGENT_MAX);
}

export function buildCookieConsentRow(
  payload: CookieConsentPayload,
  ctx: { user_id: string | null; user_agent: string | null }
): CookieConsentInsert {
  return {
    user_id: ctx.user_id,
    device_id: payload.device_id ?? null,
    consent_version: payload.consent_version,
    choices: payload.choices,
    user_agent: ctx.user_agent,
  };
}

const MS_PER_MONTH = (365.25 / 12) * 24 * 60 * 60 * 1000;

/** Fecha límite: registros anteriores deben purgarse (Luis 27/09/2026 — 24 meses). */
export function cookieConsentRetentionCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - COOKIE_CONSENT_RETENTION_MONTHS * MS_PER_MONTH);
}

export function cookieConsentRetentionCutoffIso(now: Date = new Date()): string {
  return cookieConsentRetentionCutoff(now).toISOString();
}
