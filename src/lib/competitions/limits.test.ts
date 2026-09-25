import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assertCanCreateCompetition } from './limits';

vi.mock('@/lib/subscriptions/shared', () => ({
  isSubscriptionActive: vi.fn(() => true),
}));

describe('assertCanCreateCompetition', () => {
  let supabase: any;

  beforeEach(() => {
    supabase = {
      from: vi.fn(),
    };
  });

  it('denies when player does not belong to user', async () => {
    supabase.from.mockImplementation((table: string) => {
      if (table === 'players') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const result = await assertCanCreateCompetition(supabase, 'user-1', 'player-1', 'season-1');
    expect(result).toEqual({ ok: false, reason: 'forbidden' });
  });
});
