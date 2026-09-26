import { describe, it, expect } from 'vitest';
import { getSubscriptionExpiryNotice } from '../expiry-notices';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function endAfter(base: Date, days: number): string {
  return new Date(base.getTime() + days * MS_PER_DAY).toISOString();
}

describe('getSubscriptionExpiryNotice', () => {
  const thresholds = [30, 15, 7, 1];
  const now = new Date('2026-09-26T12:00:00.000Z');

  it('returns null when no active subscriptions', () => {
    expect(getSubscriptionExpiryNotice([], now, thresholds)).toBeNull();
  });

  it('returns null when end is beyond max window', () => {
    expect(
      getSubscriptionExpiryNotice(
        [{ status: 'active', current_period_end: endAfter(now, 60) }],
        now,
        thresholds,
      ),
    ).toBeNull();
  });

  it('returns null for lifetime plan_days', () => {
    expect(
      getSubscriptionExpiryNotice(
        [{ status: 'active', current_period_end: endAfter(now, 365), plan_days: 100_000 }],
        now,
        thresholds,
      ),
    ).toBeNull();
  });

  it('picks 30-day threshold when 20 days left', () => {
    const notice = getSubscriptionExpiryNotice(
      [{ status: 'active', current_period_end: endAfter(now, 20) }],
      now,
      thresholds,
    );
    expect(notice?.noticeThresholdDays).toBe(30);
    expect(notice?.urgency).toBe('info');
  });

  it('picks 7-day threshold when 5 days left', () => {
    const notice = getSubscriptionExpiryNotice(
      [{ status: 'active', current_period_end: endAfter(now, 5) }],
      now,
      thresholds,
    );
    expect(notice?.noticeThresholdDays).toBe(7);
    expect(notice?.urgency).toBe('critical');
  });

  it('uses nearest end among several active rows', () => {
    const notice = getSubscriptionExpiryNotice(
      [
        { status: 'active', current_period_end: endAfter(now, 40) },
        { status: 'active', current_period_end: endAfter(now, 10) },
      ],
      now,
      thresholds,
    );
    expect(notice?.noticeThresholdDays).toBe(15);
  });

  it('ignores inactive status', () => {
    expect(
      getSubscriptionExpiryNotice(
        [{ status: 'canceled', current_period_end: endAfter(now, 5) }],
        now,
        thresholds,
      ),
    ).toBeNull();
  });
});
