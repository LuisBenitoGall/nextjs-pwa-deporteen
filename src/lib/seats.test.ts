import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSeatStatus } from './seats';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe('seats', () => {
  let mockSupabase: any;
  let mockAuth: any;
  let mockRpc: any;

  beforeEach(async () => {
    mockRpc = vi.fn();
    mockAuth = {
      getUser: vi.fn(),
    };
    mockSupabase = {
      auth: mockAuth,
      rpc: mockRpc,
    };

    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any);
  });

  describe('getSeatStatus', () => {
    it('should return seat status when RPC returns a number', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });
      mockRpc.mockResolvedValue({ data: 5, error: null });

      const result = await getSeatStatus();

      expect(result).toEqual({ remaining: 5, pendingPlayers: 5 });
      expect(mockRpc).toHaveBeenCalledWith('seats_remaining', { p_user_id: 'user-123' });
    });

    it('should return seat status when RPC returns an object with remaining', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });
      mockRpc.mockResolvedValue({ data: { remaining: 3 }, error: null });

      const result = await getSeatStatus();

      expect(result).toEqual({ remaining: 3, pendingPlayers: 3 });
    });

    it('should return seat status when RPC returns an object with seats', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });
      mockRpc.mockResolvedValue({ data: { seats: 7 }, error: null });

      const result = await getSeatStatus();

      expect(result).toEqual({ remaining: 7, pendingPlayers: 7 });
    });

    it('should return zero when RPC returns null or undefined', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });
      mockRpc.mockResolvedValue({ data: null, error: null });

      const result = await getSeatStatus();

      expect(result).toEqual({ remaining: 0, pendingPlayers: 0 });
    });

    it('should return zero when RPC returns negative number', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });
      mockRpc.mockResolvedValue({ data: -5, error: null });

      const result = await getSeatStatus();

      expect(result).toEqual({ remaining: 0, pendingPlayers: 0 });
    });

    it('should return zero when RPC has error', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });
      mockRpc.mockResolvedValue({ 
        data: null, 
        error: { message: 'RPC error', code: 'PGRST116' } 
      });

      const result = await getSeatStatus();

      expect(result).toEqual({ remaining: 0, pendingPlayers: 0 });
    });

    it('should use provided userId instead of session', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });
      mockRpc.mockResolvedValue({ data: 10, error: null });

      const result = await getSeatStatus('custom-user-id');

      expect(result).toEqual({ remaining: 10, pendingPlayers: 10 });
      expect(mockRpc).toHaveBeenCalledWith('seats_remaining', { p_user_id: 'custom-user-id' });
    });

    it('should throw error when no userId and no session', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(getSeatStatus()).rejects.toThrow('No user');
    });

    it('should handle edge case: RPC returns 0 seats', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });
      mockRpc.mockResolvedValue({ data: 0, error: null });

      const result = await getSeatStatus();

      expect(result).toEqual({ remaining: 0, pendingPlayers: 0 });
    });

    it('should handle edge case: RPC returns very large number', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });
      mockRpc.mockResolvedValue({ data: 999999, error: null });

      const result = await getSeatStatus();

      expect(result).toEqual({ remaining: 999999, pendingPlayers: 999999 });
    });

    it('should handle edge case: RPC returns object with both remaining and seats', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });
      mockRpc.mockResolvedValue({ data: { remaining: 5, seats: 10 }, error: null });

      const result = await getSeatStatus();

      // Debe priorizar 'remaining' sobre 'seats'
      expect(result).toEqual({ remaining: 5, pendingPlayers: 5 });
    });
  });
});
