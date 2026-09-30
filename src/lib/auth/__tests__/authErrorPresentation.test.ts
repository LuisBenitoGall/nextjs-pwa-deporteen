import { describe, expect, it } from 'vitest';
import {
  presentationFromAuthMessage,
  presentationFromAuthQuery,
} from '@/lib/auth/authErrorPresentation';

describe('authErrorPresentation', () => {
  it('maps supabase_config query', () => {
    const p = presentationFromAuthQuery('supabase_config');
    expect(p?.messageKey).toBe('error_supabase_config');
    expect(p?.ctas.some((c) => c.href === '/')).toBe(true);
  });

  it('maps invalid credentials', () => {
    const p = presentationFromAuthMessage('Invalid login credentials');
    expect(p.messageKey).toBe('auth_error_invalid_credentials');
    expect(p.ctas.some((c) => c.href === '/forgot-password')).toBe(true);
  });

  it('maps rate limit', () => {
    const p = presentationFromAuthMessage('Too many requests');
    expect(p.messageKey).toBe('auth_error_rate_limited');
  });
});
