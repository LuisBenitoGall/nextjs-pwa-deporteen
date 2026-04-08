import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isSuperadminDbRole,
  SUPERADMIN_DB_ROLE,
  userCanAccessAdminPanel,
} from './adminAccess';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

const originalEnv = process.env;

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'user@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '',
    ...overrides,
  } as User;
}

describe('adminAccess', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isSuperadminDbRole', () => {
    it('matches Superadmin case-insensitively', () => {
      expect(isSuperadminDbRole(SUPERADMIN_DB_ROLE)).toBe(true);
      expect(isSuperadminDbRole('superadmin')).toBe(true);
      expect(isSuperadminDbRole(' other ')).toBe(false);
      expect(isSuperadminDbRole(null)).toBe(false);
    });
  });

  describe('userCanAccessAdminPanel', () => {
    it('allows ADMIN_EMAILS without DB', async () => {
      process.env.ADMIN_EMAILS = 'ops@example.com';
      const supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn(),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const ok = await userCanAccessAdminPanel(supabase, makeUser({ email: 'ops@example.com' }));
      expect(ok).toBe(true);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('checks public.users.role when email not in allowlist', async () => {
      process.env.ADMIN_EMAILS = '';
      const maybeSingle = vi.fn().mockResolvedValue({
        data: { role: SUPERADMIN_DB_ROLE },
        error: null,
      });
      const supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ maybeSingle }),
          }),
        }),
      } as unknown as SupabaseClient;

      const ok = await userCanAccessAdminPanel(supabase, makeUser());
      expect(ok).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('users');
    });

    it('denies when DB role is not superadmin', async () => {
      process.env.ADMIN_EMAILS = '';
      const maybeSingle = vi.fn().mockResolvedValue({
        data: { role: 'user' },
        error: null,
      });
      const supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ maybeSingle }),
          }),
        }),
      } as unknown as SupabaseClient;

      const ok = await userCanAccessAdminPanel(supabase, makeUser());
      expect(ok).toBe(false);
    });
  });
});
