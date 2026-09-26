import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';

const mockCreateSupabaseServerClient = vi.hoisted(() => vi.fn());
const mockClearCookies = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mockCreateSupabaseServerClient,
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    delete: mockClearCookies,
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}));

describe('/logout route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateSupabaseServerClient.mockResolvedValue({
      auth: {
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    });
  });

  it('calls supabase.auth.signOut and redirects to origin', async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    mockCreateSupabaseServerClient.mockResolvedValue({
      auth: { signOut },
    });
    const prevAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;

    try {
      const res = await GET(new Request('https://app.example.com/logout'));

      expect(signOut).toHaveBeenCalled();
      expect(res.status).toBeGreaterThanOrEqual(300);
      expect(res.headers.get('location')).toBe('https://app.example.com/');
    } finally {
      if (prevAppUrl !== undefined) process.env.NEXT_PUBLIC_APP_URL = prevAppUrl;
    }
  });

  it('adds notice when account was disabled', async () => {
    const res = await GET(new Request('https://app.example.com/logout?reason=disabled'));
    expect(res.headers.get('location')).toContain('notice=account_disabled');
  });
});
