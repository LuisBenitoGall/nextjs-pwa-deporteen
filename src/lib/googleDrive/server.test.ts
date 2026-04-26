import { describe, expect, it, beforeEach } from 'vitest';
import { buildGoogleConnectUrl, createOAuthState, decryptToken, encryptToken } from '@/lib/googleDrive/server';

describe('googleDrive server helpers', () => {
  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = 'client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'client-secret';
    process.env.GOOGLE_DRIVE_REDIRECT_URI = 'http://localhost:3000/api/google/drive/callback';
    process.env.GOOGLE_DRIVE_TOKEN_SECRET = 'test-secret';
  });

  it('encrypt/decrypt refresh token roundtrip', () => {
    const plain = 'refresh-token-123';
    const encrypted = encryptToken(plain);
    expect(encrypted).not.toContain(plain);
    expect(decryptToken(encrypted)).toBe(plain);
  });

  it('builds oauth url with offline access and csrf state', () => {
    const state = createOAuthState();
    const url = buildGoogleConnectUrl(state);
    expect(url).toContain('access_type=offline');
    expect(url).toContain('prompt=consent');
    expect(url).toContain(encodeURIComponent(state));
  });
});
