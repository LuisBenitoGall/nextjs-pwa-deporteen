import { describe, it, expect } from 'vitest';
import {
  buildResetPasswordPath,
  hashIndicatesRecovery,
  shouldMiddlewareRedirectRootRecovery,
  shouldRedirectPkceRecovery,
} from '../passwordRecoveryRedirect';

describe('shouldRedirectPkceRecovery', () => {
  it('redirects home with code', () => {
    expect(shouldRedirectPkceRecovery('/', true)).toBe(true);
  });

  it('does not redirect OAuth callback', () => {
    expect(shouldRedirectPkceRecovery('/auth/callback', true)).toBe(false);
  });

  it('does not redirect when already on reset page', () => {
    expect(shouldRedirectPkceRecovery('/auth/reset-password', true)).toBe(false);
  });

  it('ignores pages without code', () => {
    expect(shouldRedirectPkceRecovery('/', false)).toBe(false);
  });
});

describe('hashIndicatesRecovery', () => {
  it('detects recovery type in hash', () => {
    expect(hashIndicatesRecovery('#access_token=x&type=recovery')).toBe(true);
  });

  it('rejects other types', () => {
    expect(hashIndicatesRecovery('#type=signup')).toBe(false);
    expect(hashIndicatesRecovery('')).toBe(false);
    expect(hashIndicatesRecovery('#')).toBe(false);
  });
});

describe('buildResetPasswordPath', () => {
  it('preserves query and hash', () => {
    const params = new URLSearchParams('code=abc');
    expect(buildResetPasswordPath(params, '#type=recovery')).toBe(
      '/auth/reset-password?code=abc#type=recovery'
    );
  });
});

describe('shouldMiddlewareRedirectRootRecovery', () => {
  it('only matches root with code', () => {
    expect(shouldMiddlewareRedirectRootRecovery('/', true)).toBe(true);
    expect(shouldMiddlewareRedirectRootRecovery('/dashboard', true)).toBe(false);
    expect(shouldMiddlewareRedirectRootRecovery('/', false)).toBe(false);
  });
});