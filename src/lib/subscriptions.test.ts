import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSubscriptionState, isSubscriptionActive } from './subscriptions';

// Mock de createSupabaseServerClient
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe('subscriptions', () => {
  let mockSupabase: any;
  let mockFrom: any;

  beforeEach(async () => {
    mockFrom = vi.fn();
    mockSupabase = {
      from: mockFrom,
    };

    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any);
  });

  describe('getSubscriptionState', () => {
    it('should return active subscription when current_period_end is in future and status is "active"', async () => {
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
            status: 'active',
          },
          {
            current_period_end: futureDate2.toISOString(),
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

    it('should handle null current_period_end with status active (subscription without expiry)', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [
          {
            current_period_end: null,
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

    it('should return inactive when current_period_end is null and status is not active/trialing', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [
          {
            current_period_end: null,
            status: 'canceled',
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

  describe('isSubscriptionActive (spec: testing-subscriptions-seats)', () => {
    const now = Date.now();

    it('returns true when status is active and current_period_end is in future', () => {
      const future = new Date(now + 86400000).toISOString();
      expect(isSubscriptionActive({ status: 'active', current_period_end: future })).toBe(true);
    });

    it('returns false when status is active and current_period_end is in past', () => {
      const past = new Date(now - 86400000).toISOString();
      expect(isSubscriptionActive({ status: 'active', current_period_end: past })).toBe(false);
    });

    it('returns true when status is trialing and current_period_end is in future', () => {
      const future = new Date(now + 86400000).toISOString();
      expect(isSubscriptionActive({ status: 'trialing', current_period_end: future })).toBe(true);
    });

    it('returns false for status canceled', () => {
      const future = new Date(now + 86400000).toISOString();
      expect(isSubscriptionActive({ status: 'canceled', current_period_end: future })).toBe(false);
    });

    it('returns false for status unpaid', () => {
      const future = new Date(now + 86400000).toISOString();
      expect(isSubscriptionActive({ status: 'unpaid', current_period_end: future })).toBe(false);
    });

    it('returns false for status paused', () => {
      const future = new Date(now + 86400000).toISOString();
      expect(isSubscriptionActive({ status: 'paused', current_period_end: future })).toBe(false);
    });

    it('returns false for status past_due', () => {
      const future = new Date(now + 86400000).toISOString();
      expect(isSubscriptionActive({ status: 'past_due', current_period_end: future })).toBe(false);
    });

    it('returns false for status incomplete', () => {
      const future = new Date(now + 86400000).toISOString();
      expect(isSubscriptionActive({ status: 'incomplete', current_period_end: future })).toBe(false);
    });

    it('returns false for status incomplete_expired', () => {
      const future = new Date(now + 86400000).toISOString();
      expect(isSubscriptionActive({ status: 'incomplete_expired', current_period_end: future })).toBe(false);
    });

    it('returns true when status is active and current_period_end is null (no expiry)', () => {
      expect(isSubscriptionActive({ status: 'active', current_period_end: null })).toBe(true);
    });

    it('returns true when status is trialing and current_period_end is null', () => {
      expect(isSubscriptionActive({ status: 'trialing', current_period_end: null })).toBe(true);
    });

    it('returns false for null/undefined sub', () => {
      expect(isSubscriptionActive(null)).toBe(false);
      expect(isSubscriptionActive(undefined)).toBe(false);
    });
  });
});
