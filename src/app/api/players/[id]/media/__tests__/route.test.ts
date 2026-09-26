import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';

const mockCreateSupabaseServerClient = vi.hoisted(() => vi.fn());
const mockGetCurrentSeasonId = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mockCreateSupabaseServerClient,
}));

vi.mock('@/lib/seasons', () => ({
  getCurrentSeasonId: mockGetCurrentSeasonId,
}));

describe('GET /api/players/[id]/media', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentSeasonId.mockResolvedValue('season-1');
  });

  it('returns 401 without session', async () => {
    mockCreateSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });

    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'player-1' }),
    });

    expect(res.status).toBe(401);
  });

  it('returns 404 when player does not belong to user', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    mockCreateSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ maybeSingle }),
          }),
        }),
      })),
    });

    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'player-other' }),
    });

    expect(res.status).toBe(404);
  });

  it('returns seasons when user owns player', async () => {
    const from = vi.fn((table: string) => {
      if (table === 'players') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'player-1' }, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'player_seasons') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ id: 'ps-1', player_id: 'player-1', season_id: 'season-1', avatar: null }],
              error: null,
            }),
          }),
        };
      }
      if (table === 'seasons') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [{ id: 'season-1', year_start: 2025, year_end: 2026 }],
              error: null,
            }),
          }),
        };
      }
      return {};
    });

    mockCreateSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from,
    });

    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'player-1' }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.playerId).toBe('player-1');
    expect(json.seasons).toHaveLength(1);
  });
});
