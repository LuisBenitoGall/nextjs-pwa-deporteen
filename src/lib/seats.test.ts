import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSeatStatus } from './seats';

// Mock de createSupabaseServerClient
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe('seats', () => {
  let mockSupabase: any;
  let mockAuth: any;
  let mockRpc: any;

  beforeEach(() => {
    mockRpc = vi.fn();
    mockAuth = {
      getSession: vi.fn(),
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
      mockAuth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null,
      });
      mockRpc.mockResolvedValue({ data: 5, error: null });

      const result = await getSeatStatus();

      expect(result).toEqual({ remaining: 5, pendingPlayers: 5 });
      expect(mockRpc).toHaveBeenCalledWith('seats_remaining', { p_user_id: 'user-123' });
    });

    it('should return seat status when RPC returns an object with remaining', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null,
      });
      mockRpc.mockResolvedValue({ data: { remaining: 3 }, error: null });

      const result = await getSeatStatus();

      expect(result).toEqual({ remaining: 3, pendingPlayers: 3 });
    });

    it('should return seat status when RPC returns an object with seats', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null,
      });
      mockRpc.mockResolvedValue({ data: { seats: 7 }, error: null });

      const result = await getSeatStatus();

      expect(result).toEqual({ remaining: 7, pendingPlayers: 7 });
    });

    it('should return zero when RPC returns null or undefined', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null,
      });
      mockRpc.mockResolvedValue({ data: null, error: null });

      const result = await getSeatStatus();

      expect(result).toEqual({ remaining: 0, pendingPlayers: 0 });
    });

    it('should return zero when RPC returns negative number', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null,
      });
      mockRpc.mockResolvedValue({ data: -5, error: null });

      const result = await getSeatStatus();

      expect(result).toEqual({ remaining: 0, pendingPlayers: 0 });
    });

    it('should return zero when RPC has error', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
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
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });
      mockRpc.mockResolvedValue({ data: 10, error: null });

      const result = await getSeatStatus('custom-user-id');

      expect(result).toEqual({ remaining: 10, pendingPlayers: 10 });
      expect(mockRpc).toHaveBeenCalledWith('seats_remaining', { p_user_id: 'custom-user-id' });
    });

    it('should throw error when no userId and no session', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      await expect(getSeatStatus()).rejects.toThrow('No session');
    });

    it('should handle empty object from RPC', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null,
      });
      mockRpc.mockResolvedValue({ data: {}, error: null });

      const result = await getSeatStatus();

      expect(result).toEqual({ remaining: 0, pendingPlayers: 0 });
    });
  });
});
