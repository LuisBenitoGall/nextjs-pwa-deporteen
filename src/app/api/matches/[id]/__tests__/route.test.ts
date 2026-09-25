import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH, DELETE } from '../route';

const mockGetServerUser = vi.hoisted(() => vi.fn());
const mockCreateSupabaseServerClient = vi.hoisted(() => vi.fn());
const mockUserOwnsMatch = vi.hoisted(() => vi.fn());
const mockDeleteMatchMediaForMatches = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/server', () => ({
  getServerUser: mockGetServerUser,
  createSupabaseServerClient: mockCreateSupabaseServerClient,
}));

vi.mock('@/lib/matches/ownership', () => ({
  userOwnsMatch: mockUserOwnsMatch,
}));

vi.mock('@/lib/matchMedia/cleanup', () => ({
  deleteMatchMediaForMatches: mockDeleteMatchMediaForMatches,
}));

describe('PATCH /api/matches/[id]', () => {
  const mockMaybeSingle = vi.fn();
  const mockUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerUser.mockResolvedValue({ user: { id: 'user-1' } });
    mockUserOwnsMatch.mockResolvedValue(true);
    mockUpdate.mockReturnValue({ eq: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }) }) });
    mockCreateSupabaseServerClient.mockResolvedValue({
      from: vi.fn(() => ({ update: mockUpdate })),
    });
  });

  it('returns 404 when update affects no row', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const res = await PATCH(
      new Request('http://localhost', {
        method: 'PATCH',
        body: JSON.stringify({ my_score: 1 }),
      }),
      { params: Promise.resolve({ id: 'match-1' }) }
    );

    expect(res.status).toBe(404);
  });

  it('returns 200 with data when update succeeds', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: 'match-1', my_score: 1 }, error: null });

    const res = await PATCH(
      new Request('http://localhost', {
        method: 'PATCH',
        body: JSON.stringify({ my_score: 1 }),
      }),
      { params: Promise.resolve({ id: 'match-1' }) }
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe('match-1');
  });
});

describe('DELETE /api/matches/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerUser.mockResolvedValue({ user: { id: 'user-1' } });
    mockUserOwnsMatch.mockResolvedValue(true);
    mockDeleteMatchMediaForMatches.mockResolvedValue(undefined);
  });

  it('cleans media before deleting match', async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: { id: 'match-1' }, error: null });
    const mockEq = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }) });
    mockCreateSupabaseServerClient.mockResolvedValue({
      from: vi.fn(() => ({ delete: vi.fn().mockReturnValue({ eq: mockEq }) })),
    });

    const res = await DELETE(
      new Request('http://localhost', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'match-1' }) }
    );

    expect(res.status).toBe(200);
    expect(mockDeleteMatchMediaForMatches).toHaveBeenCalledWith(expect.anything(), 'user-1', ['match-1']);
  });
});
