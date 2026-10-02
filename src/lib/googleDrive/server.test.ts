import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import {
  buildGoogleConnectUrl,
  createOAuthState,
  decryptToken,
  encryptToken,
  GoogleOAuthError,
  parseGoogleOAuthErrorBody,
  refreshGoogleAccessToken,
} from '@/lib/googleDrive/server';

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

  it('parseGoogleOAuthErrorBody reads oauth json', () => {
    expect(parseGoogleOAuthErrorBody('{"error":"invalid_grant","error_description":"Bad Request"}')).toEqual({
      error: 'invalid_grant',
      error_description: 'Bad Request',
    });
    expect(parseGoogleOAuthErrorBody('not-json')).toBeNull();
  });

  it('GoogleOAuthError flags invalid_grant as reconnect', () => {
    const err = new GoogleOAuthError('msg', 'invalid_grant');
    expect(err.requiresReconnect).toBe(true);
  });
});

describe('refreshGoogleAccessToken', () => {
  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = 'client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'client-secret';
    process.env.GOOGLE_DRIVE_REDIRECT_URI = 'http://localhost:3000/api/google/drive/callback';
    process.env.GOOGLE_DRIVE_TOKEN_SECRET = 'test-secret';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('throws GoogleOAuthError on invalid_grant without raw JSON message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        text: async () => JSON.stringify({ error: 'invalid_grant', error_description: 'Bad Request' }),
      })
    );

    await expect(refreshGoogleAccessToken('rt')).rejects.toMatchObject({
      name: 'GoogleOAuthError',
      oauthError: 'invalid_grant',
      message: 'Google Drive requiere reconexión',
    });
  });
});
