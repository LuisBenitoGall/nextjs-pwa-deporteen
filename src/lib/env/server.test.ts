import { describe, expect, it, beforeEach } from 'vitest';
import {
  GoogleDriveEnvError,
  getGoogleDriveClientCredentials,
  isGoogleDriveOAuthConfigured,
  isValidGoogleDriveRedirectUri,
} from '@/lib/env/server';

describe('google drive server env', () => {
  beforeEach(() => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_DRIVE_REDIRECT_URI;
    delete process.env.GOOGLE_DRIVE_TOKEN_SECRET;
  });

  it('rejects invalid redirect URIs without throwing from isGoogleDriveOAuthConfigured', () => {
    process.env.GOOGLE_CLIENT_ID = 'id';
    process.env.GOOGLE_CLIENT_SECRET = 'secret';
    process.env.GOOGLE_DRIVE_REDIRECT_URI = 'not-a-url';
    process.env.GOOGLE_DRIVE_TOKEN_SECRET = 'tok';
    expect(isValidGoogleDriveRedirectUri(process.env.GOOGLE_DRIVE_REDIRECT_URI)).toBe(false);
    expect(isGoogleDriveOAuthConfigured()).toBe(false);
  });

  it('accepts production callback URL shape', () => {
    process.env.GOOGLE_CLIENT_ID = 'id';
    process.env.GOOGLE_CLIENT_SECRET = 'secret';
    process.env.GOOGLE_DRIVE_REDIRECT_URI = 'https://www.deporteen.com/api/google/drive/callback';
    process.env.GOOGLE_DRIVE_TOKEN_SECRET = 'tok';
    expect(isGoogleDriveOAuthConfigured()).toBe(true);
  });

  it('refresh credentials do not require redirect URI', () => {
    process.env.GOOGLE_CLIENT_ID = 'id';
    process.env.GOOGLE_CLIENT_SECRET = 'secret';
    const creds = getGoogleDriveClientCredentials();
    expect(creds.clientId).toBe('id');
  });

  it('throws GoogleDriveEnvError when oauth client creds missing', () => {
    expect(() => getGoogleDriveClientCredentials()).toThrow(GoogleDriveEnvError);
  });
});
