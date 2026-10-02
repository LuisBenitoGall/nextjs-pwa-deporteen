import { describe, expect, it } from 'vitest';
import {
  friendlyAuthLoadMessage,
  isAuthNavigatorLockError,
  withAuthLockRetry,
} from '@/lib/supabase/authClientErrors';

describe('authClientErrors', () => {
  it('detecta AbortError por lock de navigator', () => {
    const err = new DOMException("Lock broken by another request with the 'steal' option", 'AbortError');
    expect(isAuthNavigatorLockError(err)).toBe(true);
    expect(friendlyAuthLoadMessage(err)).toContain('sincronizando');
  });

  it('reintenta tras lock y acaba bien', async () => {
    let calls = 0;
    const result = await withAuthLockRetry(async () => {
      calls += 1;
      if (calls === 1) {
        throw new DOMException('Lock broken', 'AbortError');
      }
      return 'ok';
    }, { attempts: 2, delayMs: 1 });
    expect(result).toBe('ok');
    expect(calls).toBe(2);
  });
});
