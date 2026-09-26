import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';

const mockCreateSupabaseServerClient = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mockCreateSupabaseServerClient,
}));

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 on bad credentials', async () => {
    mockCreateSupabaseServerClient.mockResolvedValue({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Invalid login credentials' },
        }),
      },
    });

    const res = await POST(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'a@b.com', password: 'wrong' }),
      }) as any
    );

    expect(res.status).toBe(401);
  });

  it('returns 429 after rate limit exceeded', async () => {
    mockCreateSupabaseServerClient.mockResolvedValue({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: { id: 'u1' } },
          error: null,
        }),
      },
    });

    const body = JSON.stringify({ email: 'x@y.com', password: 'secret123' });
    const makeReq = () =>
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.0.0.99' },
        body,
      }) as any;

    for (let i = 0; i < 10; i++) {
      const res = await POST(makeReq());
      expect(res.status).toBe(200);
    }
    const blocked = await POST(makeReq());
    expect(blocked.status).toBe(429);
  });
});
