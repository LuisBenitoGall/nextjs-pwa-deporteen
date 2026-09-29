import { describe, it, expect } from 'vitest';
import {
  buildNotifiedExpiryEmailUpdate,
  pickSubscriptionExpiryEmailCandidate,
  wasExpiryEmailSentForThreshold,
} from '../expiry-email';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-09-26T12:00:00.000Z');
const thresholds = [30, 15, 7, 1] as const;

function endAfter(days: number): string {
  return new Date(now.getTime() + days * MS_PER_DAY).toISOString();
}

describe('wasExpiryEmailSentForThreshold', () => {
  it('returns false when period changed', () => {
    const end = endAfter(10);
    expect(
      wasExpiryEmailSentForThreshold(end, 15, { periodEnd: endAfter(20), thresholdDays: [15] }),
    ).toBe(false);
  });

  it('returns true when threshold already recorded', () => {
    const end = endAfter(10);
    expect(wasExpiryEmailSentForThreshold(end, 15, { periodEnd: end, thresholdDays: [30, 15] })).toBe(
      true,
    );
  });
});

describe('buildNotifiedExpiryEmailUpdate', () => {
  it('resets thresholds when period end changes', () => {
    const end = endAfter(5);
    const next = buildNotifiedExpiryEmailUpdate(end, { periodEnd: endAfter(30), thresholdDays: [30] }, 7);
    expect(next).toEqual({ periodEnd: end, thresholdDays: [7] });
  });

  it('merges thresholds for same period', () => {
    const end = endAfter(10);
    const next = buildNotifiedExpiryEmailUpdate(end, { periodEnd: end, thresholdDays: [30] }, 15);
    expect(next.thresholdDays).toEqual([30, 15]);
  });
});

describe('pickSubscriptionExpiryEmailCandidate', () => {
  it('returns candidate when in 15-day window and not yet notified', () => {
    const end = endAfter(10);
    const candidate = pickSubscriptionExpiryEmailCandidate(
      {
        userId: 'u1',
        email: 'a@example.com',
        locale: 'es',
        name: 'Ana',
        subs: [
          {
            id: 'sub-1',
            status: 'active',
            current_period_end: end,
            notified_expiry_email: { periodEnd: end, thresholdDays: [30] },
          },
        ],
      },
      now,
      thresholds,
    );
    expect(candidate?.noticeThresholdDays).toBe(15);
    expect(candidate?.subscriptionId).toBe('sub-1');
  });

  it('returns null when threshold already emailed', () => {
    const end = endAfter(10);
    expect(
      pickSubscriptionExpiryEmailCandidate(
        {
          userId: 'u1',
          email: 'a@example.com',
          locale: 'es',
          name: null,
          subs: [
            {
              id: 'sub-1',
              status: 'active',
              current_period_end: end,
              notified_expiry_email: { periodEnd: end, thresholdDays: [30, 15] },
            },
          ],
        },
        now,
        thresholds,
      ),
    ).toBeNull();
  });

  it('returns null for lifetime plan (para siempre)', () => {
    const end = endAfter(10);
    expect(
      pickSubscriptionExpiryEmailCandidate(
        {
          userId: 'u1',
          email: 'a@example.com',
          locale: 'es',
          name: null,
          subs: [
            {
              id: 'sub-1',
              status: 'active',
              current_period_end: end,
              plan_days: 50_000,
            },
          ],
        },
        now,
        thresholds,
      ),
    ).toBeNull();
  });
});
