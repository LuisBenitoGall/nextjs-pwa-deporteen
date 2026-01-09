import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSubscriptionState } from './subscriptions';

// Mock de createSupabaseServerClient
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe('subscriptions', () => {
  let mockSupabase: any;
  let mockFrom: any;

  beforeEach(() => {
    mockFrom = vi.fn();
    mockSupabase = {
      from: mockFrom,
    };

    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any);
  });

  describe('getSubscriptionState', () => {
    it('should return active subscription when current_period_end is in future and status is true', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [
          {
            current_period_end: futureDate.toISOString(),
            status: true,
          },
        ],
        error: null,
      });

      mockFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      const result = await getSubscriptionState('user-123');

      expect(result).toEqual({
        hasAnySubscription: true,
        isActiveSubscription: true,
      });
      expect(mockFrom).toHaveBeenCalledWith('subscriptions');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');
    });

    it('should return inactive subscription when current_period_end is in past', async () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [
          {
            current_period_end: pastDate.toISOString(),
            status: true,
          },
        ],
        error: null,
      });

      mockFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      const result = await getSubscriptionState('user-123');

      expect(result).toEqual({
        hasAnySubscription: true,
        isActiveSubscription: false,
      });
    });

    it('should return inactive subscription when status is false', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [
          {
            current_period_end: futureDate.toISOString(),
            status: false,
          },
        ],
        error: null,
      });

      mockFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      const result = await getSubscriptionState('user-123');

      expect(result).toEqual({
        hasAnySubscription: true,
        isActiveSubscription: false,
      });
    });

    it('should return active subscription when status is string "active"', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [
          {
            current_period_end: futureDate.toISOString(),
            status: 'active',
          },
        ],
        error: null,
      });

      mockFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      const result = await getSubscriptionState('user-123');

      expect(result).toEqual({
        hasAnySubscription: true,
        isActiveSubscription: true,
      });
    });

    it('should return inactive subscription when status is string "inactive"', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [
          {
            current_period_end: futureDate.toISOString(),
            status: 'inactive',
          },
        ],
        error: null,
      });

      mockFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      const result = await getSubscriptionState('user-123');

      expect(result).toEqual({
        hasAnySubscription: true,
        isActiveSubscription: false,
      });
    });

    it('should return no subscription when user has no subscriptions', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      mockFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      const result = await getSubscriptionState('user-123');

      expect(result).toEqual({
        hasAnySubscription: false,
        isActiveSubscription: false,
      });
    });

    it('should return no subscription when subscriptions is null', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      mockFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      const result = await getSubscriptionState('user-123');

      expect(result).toEqual({
        hasAnySubscription: false,
        isActiveSubscription: false,
      });
    });

    it('should handle multiple subscriptions and use the latest one', async () => {
      const futureDate1 = new Date();
      futureDate1.setFullYear(futureDate1.getFullYear() + 2);
      
      const futureDate2 = new Date();
      futureDate2.setFullYear(futureDate2.getFullYear() + 1);

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [
          {
            current_period_end: futureDate1.toISOString(),
            status: true,
          },
          {
            current_period_end: futureDate2.toISOString(),
            status: true,
          },
        ],
        error: null,
      });

      mockFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      const result = await getSubscriptionState('user-123');

      expect(result).toEqual({
        hasAnySubscription: true,
        isActiveSubscription: true,
      });
    });

    it('should handle null current_period_end', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [
          {
            current_period_end: null,
            status: true,
          },
        ],
        error: null,
      });

      mockFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      const result = await getSubscriptionState('user-123');

      expect(result).toEqual({
        hasAnySubscription: true,
        isActiveSubscription: false,
      });
    });
  });
});
