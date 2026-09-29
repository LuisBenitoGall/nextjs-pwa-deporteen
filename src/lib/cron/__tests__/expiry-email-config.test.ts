import { describe, it, expect, afterEach } from 'vitest';
import { parseExpiryEmailRunConfig } from '../expiry-email-config';

function mockReq(query: string) {
  return {
    nextUrl: new URL(`https://example.com/api/cron/daily${query}`),
  } as import('next/server').NextRequest;
}

describe('parseExpiryEmailRunConfig', () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it('defaults to live mode', () => {
    delete process.env.SUBSCRIPTION_EXPIRY_EMAIL_DRY_RUN;
    expect(parseExpiryEmailRunConfig().mode).toBe('live');
  });

  it('uses env dry run', () => {
    process.env.SUBSCRIPTION_EXPIRY_EMAIL_DRY_RUN = 'true';
    expect(parseExpiryEmailRunConfig().mode).toBe('dry_run');
  });

  it('query mode overrides env', () => {
    process.env.SUBSCRIPTION_EXPIRY_EMAIL_DRY_RUN = 'true';
    expect(parseExpiryEmailRunConfig(mockReq('?mode=live')).mode).toBe('live');
    expect(parseExpiryEmailRunConfig(mockReq('?mode=backfill')).mode).toBe('backfill');
  });

  it('parses max per run', () => {
    process.env.SUBSCRIPTION_EXPIRY_EMAIL_MAX_PER_RUN = '10';
    expect(parseExpiryEmailRunConfig().maxPerRun).toBe(10);
  });
});
