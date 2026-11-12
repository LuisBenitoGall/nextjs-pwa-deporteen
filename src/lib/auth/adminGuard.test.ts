import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SUPERADMIN_DB_ROLE } from './adminAccess';

const originalEnv = process.env;

vi.mock('server-only', () => ({}));

vi.mock('@/lib/supabase/server', () => ({
  getServerUser: vi.fn(),
  createSupabaseServerClientReadOnly: vi.fn(),
}));

vi.mock('./adminAccess', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./adminAccess')>();
  return {
    ...actual,
    userCanAccessAdminPanel: vi.fn(),
    userIsSuperadminInDb: vi.fn(),
  };
});

import { getServerUser, createSupabaseServerClientReadOnly } from '@/lib/supabase/server';
import { userCanAccessAdminPanel, userIsSuperadminInDb } from './adminAccess';
import { requireSuperadmin, requireAdmin } from './adminGuard';

describe('adminGuard requireSuperadmin', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv, ADMIN_EMAILS: 'ops@example.com' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns 403 when admin panel ok but not superadmin in DB', async () => {
    vi.mocked(getServerUser).mockResolvedValue({
      user: { id: 'u1', email: 'ops@example.com' } as any,
    });
    vi.mocked(createSupabaseServerClientReadOnly).mockResolvedValue({} as any);
    vi.mocked(userCanAccessAdminPanel).mockResolvedValue(true);
    vi.mocked(userIsSuperadminInDb).mockResolvedValue(false);

    const result = await requireSuperadmin();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it('allows when superadmin in DB', async () => {
    vi.mocked(getServerUser).mockResolvedValue({
      user: { id: 'u2', email: 'root@example.com' } as any,
    });
    vi.mocked(createSupabaseServerClientReadOnly).mockResolvedValue({} as any);
    vi.mocked(userCanAccessAdminPanel).mockResolvedValue(true);
    vi.mocked(userIsSuperadminInDb).mockResolvedValue(true);

    const result = await requireSuperadmin();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.id).toBe('u2');
    }
  });

  it('requireAdmin still allows ADMIN_EMAILS without DB superadmin', async () => {
    vi.mocked(getServerUser).mockResolvedValue({
      user: { id: 'u3', email: 'ops@example.com' } as any,
    });
    vi.mocked(createSupabaseServerClientReadOnly).mockResolvedValue({} as any);
    vi.mocked(userCanAccessAdminPanel).mockResolvedValue(true);

    const result = await requireAdmin();
    expect(result.ok).toBe(true);
  });
});

describe('SUPERADMIN_DB_ROLE constant', () => {
  it('is Superadmin', () => {
    expect(SUPERADMIN_DB_ROLE).toBe('Superadmin');
  });
});
