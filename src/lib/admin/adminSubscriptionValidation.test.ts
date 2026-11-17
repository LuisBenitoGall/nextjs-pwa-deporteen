import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  startOfTodayUtcMs,
  validateAdminSubscriptionPeriodEnd,
  validateAdminSubscriptionPlanId,
} from './adminSubscriptionValidation';

describe('validateAdminSubscriptionPeriodEnd', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-12T15:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects missing value', () => {
    expect(validateAdminSubscriptionPeriodEnd(null).ok).toBe(false);
    expect(validateAdminSubscriptionPeriodEnd('').ok).toBe(false);
  });

  it('rejects invalid date', () => {
    const r = validateAdminSubscriptionPeriodEnd('not-a-date');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('invalid');
  });

  it('rejects end before start of today UTC', () => {
    const r = validateAdminSubscriptionPeriodEnd('2026-11-11T23:59:59.000Z');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('before_today');
  });

  it('accepts end on or after start of today UTC', () => {
    const todayStart = new Date(startOfTodayUtcMs()).toISOString();
    const r = validateAdminSubscriptionPeriodEnd(todayStart);
    expect(r.ok).toBe(true);
    const tomorrow = validateAdminSubscriptionPeriodEnd('2026-11-13T00:00:00.000Z');
    expect(tomorrow.ok).toBe(true);
  });
});

describe('validateAdminSubscriptionPlanId', () => {
  it('requires non-empty string', () => {
    expect(validateAdminSubscriptionPlanId('free')).toBe(true);
    expect(validateAdminSubscriptionPlanId('')).toBe(false);
    expect(validateAdminSubscriptionPlanId(null)).toBe(false);
  });
});
