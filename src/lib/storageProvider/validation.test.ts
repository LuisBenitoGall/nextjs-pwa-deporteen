import { describe, expect, it } from 'vitest';
import { isAllowedProvider, isCrossUserAttempt } from '@/lib/storageProvider/validation';

describe('storage provider validation', () => {
  it('accepts allowed providers and rejects invalid values', () => {
    expect(isAllowedProvider('local')).toBe(true);
    expect(isAllowedProvider('drive')).toBe(true);
    expect(isAllowedProvider('r2')).toBe(true);
    expect(isAllowedProvider('supabase')).toBe(true);
    expect(isAllowedProvider('dropbox')).toBe(false);
  });

  it('detects cross-user attempts', () => {
    expect(isCrossUserAttempt('user-a', 'user-b')).toBe(true);
    expect(isCrossUserAttempt('user-a', 'user-a')).toBe(false);
    expect(isCrossUserAttempt('user-a', undefined)).toBe(false);
  });
});
