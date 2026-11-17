import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getAuthSiteUrl, getPasswordResetRedirectUrl, normalizeSiteUrl } from '../siteUrl';

describe('normalizeSiteUrl', () => {
  it('trims trailing slashes', () => {
    expect(normalizeSiteUrl('https://www.deporteen.com/')).toBe('https://www.deporteen.com');
    expect(normalizeSiteUrl('https://www.deporteen.com///')).toBe('https://www.deporteen.com');
  });
});

describe('getAuthSiteUrl', () => {
  const env = { ...process.env };

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_APP_URL = env.NEXT_PUBLIC_APP_URL;
  });

  it('prefers NEXT_PUBLIC_SITE_URL', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.deporteen.com/';
    process.env.NEXT_PUBLIC_APP_URL = 'https://other.example';
    expect(getAuthSiteUrl()).toBe('https://www.deporteen.com');
  });

  it('falls back to NEXT_PUBLIC_APP_URL', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.deporteen.com';
    expect(getAuthSiteUrl()).toBe('https://app.deporteen.com');
  });

  it('uses client origin when env is missing', () => {
    expect(getAuthSiteUrl('http://localhost:3000')).toBe('http://localhost:3000');
  });
});

describe('getPasswordResetRedirectUrl', () => {
  const env = { ...process.env };

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_APP_URL = env.NEXT_PUBLIC_APP_URL;
  });

  it('builds reset path from env', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.deporteen.com';
    expect(getPasswordResetRedirectUrl()).toBe('https://www.deporteen.com/auth/reset-password');
  });

  it('builds reset path from origin fallback', () => {
    expect(getPasswordResetRedirectUrl('http://127.0.0.1:3000')).toBe(
      'http://127.0.0.1:3000/auth/reset-password'
    );
  });

  it('throws without env or origin', () => {
    expect(() => getPasswordResetRedirectUrl()).toThrow(/Missing site URL/);
  });
});