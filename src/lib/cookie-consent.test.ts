import { describe, it, expect } from 'vitest';
import {
  buildCookieConsentRow,
  cookieConsentRetentionCutoff,
  cookieConsentRetentionCutoffIso,
  parseCookieConsentPayload,
  parseConsentChoices,
  truncateUserAgent,
} from './cookie-consent';

describe('parseConsentChoices', () => {
  it('accepts valid choices', () => {
    expect(
      parseConsentChoices({
        necesarias: true,
        analitica: false,
        funcionales: true,
        marketing: false,
      })
    ).toEqual({
      necesarias: true,
      analitica: false,
      funcionales: true,
      marketing: false,
    });
  });

  it('rejects when necesarias is not true', () => {
    expect(parseConsentChoices({ necesarias: false, analitica: false, funcionales: false, marketing: false })).toBeNull();
  });
});

describe('parseCookieConsentPayload', () => {
  it('parses minimal payload', () => {
    expect(
      parseCookieConsentPayload({
        consent_version: 'v1',
        choices: { necesarias: true, analitica: true, funcionales: false, marketing: false },
      })
    ).toEqual({
      consent_version: 'v1',
      choices: { necesarias: true, analitica: true, funcionales: false, marketing: false },
      device_id: null,
    });
  });

  it('rejects missing consent_version', () => {
    expect(parseCookieConsentPayload({ choices: { necesarias: true, analitica: false, funcionales: false, marketing: false } })).toBeNull();
  });
});

describe('buildCookieConsentRow', () => {
  it('maps authenticated user', () => {
    const payload = parseCookieConsentPayload({
      consent_version: 'v1',
      choices: { necesarias: true, analitica: false, funcionales: false, marketing: false },
      device_id: 'dev-1',
    })!;
    const row = buildCookieConsentRow(payload, { user_id: 'user-uuid', user_agent: 'TestAgent' });
    expect(row.user_id).toBe('user-uuid');
    expect(row.device_id).toBe('dev-1');
    expect(row.consent_version).toBe('v1');
    expect(row.user_agent).toBe('TestAgent');
  });
});

describe('truncateUserAgent', () => {
  it('truncates long strings', () => {
    const long = 'x'.repeat(600);
    expect(truncateUserAgent(long)?.length).toBe(512);
  });
});

describe('cookieConsentRetentionCutoff', () => {
  it('is 24 months before reference date', () => {
    const now = new Date('2026-09-27T12:00:00.000Z');
    const cutoff = cookieConsentRetentionCutoff(now);
    const approxDays = (now.getTime() - cutoff.getTime()) / (24 * 60 * 60 * 1000);
    expect(approxDays).toBeGreaterThan(730);
    expect(approxDays).toBeLessThan(732);
    expect(cookieConsentRetentionCutoffIso(now)).toBe(cutoff.toISOString());
  });
});
