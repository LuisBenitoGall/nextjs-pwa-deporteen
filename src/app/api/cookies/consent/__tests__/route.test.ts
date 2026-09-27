import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockCreateSupabaseServerClient = vi.hoisted(() => vi.fn());
const mockInsert = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mockCreateSupabaseServerClient,
}));

function jsonRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/cookies/consent', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': 'vitest' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  consent_version: 'v1',
  choices: { necesarias: true, analitica: false, funcionales: false, marketing: false },
};

describe('POST /api/cookies/consent', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    mockInsert.mockReset();
    mockCreateSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
      from: vi.fn(() => ({
        insert: mockInsert,
      })),
    });
    ({ POST } = await import('../route'));
  });

  it('returns 400 on invalid body', async () => {
    const res = await POST(jsonRequest({ consent_version: 'v1' }));
    expect(res.status).toBe(400);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('returns ok true on successful insert', async () => {
    mockInsert.mockResolvedValue({ error: null });
    const res = await POST(jsonRequest(validBody));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: null,
        consent_version: 'v1',
        choices: validBody.choices,
        user_agent: 'vitest',
      })
    );
  });

  it('returns ok false without blocking when insert fails', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'relation does not exist' } });
    const res = await POST(jsonRequest(validBody));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.ok).toBe(false);
    expect(data.warning).toBe('consent_not_persisted');
  });

  it('sets user_id from session', async () => {
    mockCreateSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'uid-1' } } }),
      },
      from: vi.fn(() => ({
        insert: mockInsert,
      })),
    });
    vi.resetModules();
    ({ POST } = await import('../route'));
    mockInsert.mockResolvedValue({ error: null });
    const res = await POST(jsonRequest(validBody));
    expect(res.status).toBe(200);
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'uid-1' }));
  });
});
