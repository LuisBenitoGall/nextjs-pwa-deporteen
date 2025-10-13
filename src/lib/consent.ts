// lib/consent.ts
export type ConsentChoices = {
  necesarias: true;           // fijo
  analitica: boolean;
  funcionales: boolean;
  marketing: boolean;
};
export const CONSENT_COOKIE = 'dp_consent_v1';      // versiona si cambian textos
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 180;  // 6 meses (revalidación prudente). CNIL sugirió 6 meses como práctica. :contentReference[oaicite:5]{index=5}

export function getConsentFromCookie(): ConsentChoices | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`));
  if (!m) return null;
  try { return JSON.parse(decodeURIComponent(m[1])); } catch { return null; }
}

export function setConsentCookie(choices: ConsentChoices) {
  const value = encodeURIComponent(JSON.stringify(choices));
  document.cookie = `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${CONSENT_MAX_AGE}; SameSite=Lax`;
}
