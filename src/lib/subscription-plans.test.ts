import { describe, it, expect } from 'vitest';
import {
  euros,
  yearsFromDays,
  isLifetime,
  planNameForT,
  applyI18nToPlans,
  LOCAL_FREE_PLAN,
  LOCAL_PAID_PLANS,
  type Plan,
} from './subscription-plans';

describe('subscription-plans', () => {
  describe('euros', () => {
    it('should convert cents to euros with 2 decimals', () => {
      expect(euros(100)).toBe('1.00');
      expect(euros(199)).toBe('1.99');
      expect(euros(3000)).toBe('30.00');
      expect(euros(1234)).toBe('12.34');
    });

    it('should handle zero cents', () => {
      expect(euros(0)).toBe('0.00');
    });

    it('should handle single digit cents', () => {
      expect(euros(5)).toBe('0.05');
    });
  });

  describe('yearsFromDays', () => {
    it('should convert days to years with 1 decimal', () => {
      expect(yearsFromDays(365)).toBe(1);
      expect(yearsFromDays(730)).toBe(2);
      expect(yearsFromDays(1095)).toBe(3);
    });

    it('should handle partial years', () => {
      expect(yearsFromDays(182)).toBe(0.5);
      expect(yearsFromDays(91)).toBe(0.2);
    });

    it('should round to 1 decimal place', () => {
      expect(yearsFromDays(400)).toBe(1.1);
      expect(yearsFromDays(500)).toBe(1.4);
    });

    it('should handle zero days', () => {
      expect(yearsFromDays(0)).toBe(0);
    });
  });

  describe('isLifetime', () => {
    it('should return true for plans with 50000+ days', () => {
      expect(isLifetime({ days: 50000 })).toBe(true);
      expect(isLifetime({ days: 100000 })).toBe(true);
      expect(isLifetime({ days: 999999 })).toBe(true);
    });

    it('should return false for plans with less than 50000 days', () => {
      expect(isLifetime({ days: 49999 })).toBe(false);
      expect(isLifetime({ days: 365 })).toBe(false);
      expect(isLifetime({ days: 1095 })).toBe(false);
      expect(isLifetime({ days: 0 })).toBe(false);
    });
  });

  describe('planNameForT', () => {
    const mockT = (key: string) => {
      const translations: Record<string, string> = {
        'plan_anual': 'Plan Anual',
        'plan_trianual': 'Plan 3 Años',
        'plan_siempre': 'Plan Para Siempre',
        'plan_codigo_oculto': 'Plan Código',
      };
      return translations[key] || key;
    };

    it('should return plan.name if it exists and is not empty', () => {
      const plan: Plan = {
        id: 'test',
        nameKey: 'plan_anual',
        name: 'Custom Name',
        days: 365,
        amount_cents: 100,
        currency: 'EUR',
        active: true,
        free: false,
      };

      expect(planNameForT(plan, mockT)).toBe('Custom Name');
    });

    it('should use translation function when name is not provided', () => {
      const plan: Plan = {
        id: 'test',
        nameKey: 'plan_anual',
        days: 365,
        amount_cents: 100,
        currency: 'EUR',
        active: true,
        free: false,
      };

      expect(planNameForT(plan, mockT)).toBe('Plan Anual');
    });

    it('should use translation function when name is empty string', () => {
      const plan: Plan = {
        id: 'test',
        nameKey: 'plan_anual',
        name: '',
        days: 365,
        amount_cents: 100,
        currency: 'EUR',
        active: true,
        free: false,
      };

      expect(planNameForT(plan, mockT)).toBe('Plan Anual');
    });

    it('should use translation function when name is only whitespace', () => {
      const plan: Plan = {
        id: 'test',
        nameKey: 'plan_anual',
        name: '   ',
        days: 365,
        amount_cents: 100,
        currency: 'EUR',
        active: true,
        free: false,
      };

      expect(planNameForT(plan, mockT)).toBe('Plan Anual');
    });

    it('should return fallback when translation fails', () => {
      const plan: Plan = {
        id: 'test',
        nameKey: 'unknown_key',
        days: 365,
        amount_cents: 100,
        currency: 'EUR',
        active: true,
        free: false,
      };

      expect(planNameForT(plan, mockT, 'Fallback Name')).toBe('Fallback Name');
    });

    it('should return nameKey when translation fails and no fallback', () => {
      const plan: Plan = {
        id: 'test',
        nameKey: 'unknown_key',
        days: 365,
        amount_cents: 100,
        currency: 'EUR',
        active: true,
        free: false,
      };

      expect(planNameForT(plan, mockT)).toBe('unknown_key');
    });

    it('should handle translation function that throws error', () => {
      const throwingT = () => {
        throw new Error('Translation error');
      };

      const plan: Plan = {
        id: 'test',
        nameKey: 'plan_anual',
        days: 365,
        amount_cents: 100,
        currency: 'EUR',
        active: true,
        free: false,
      };

      expect(planNameForT(plan, throwingT, 'Fallback')).toBe('Fallback');
    });
  });

  describe('applyI18nToPlans', () => {
    const mockT = (key: string) => {
      const translations: Record<string, string> = {
        'plan_anual': 'Plan Anual',
        'plan_trianual': 'Plan 3 Años',
        'plan_siempre': 'Plan Para Siempre',
      };
      return translations[key] || key;
    };

    it('should apply translations to all plans', () => {
      const plans: Plan[] = [
        {
          id: 'plan-1',
          nameKey: 'plan_anual',
          days: 365,
          amount_cents: 100,
          currency: 'EUR',
          active: true,
          free: false,
        },
        {
          id: 'plan-2',
          nameKey: 'plan_trianual',
          days: 1095,
          amount_cents: 200,
          currency: 'EUR',
          active: true,
          free: false,
        },
      ];

      const result = applyI18nToPlans(plans, mockT);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Plan Anual');
      expect(result[1].name).toBe('Plan 3 Años');
    });

    it('should preserve all plan properties', () => {
      const plans: Plan[] = [
        {
          id: 'plan-1',
          nameKey: 'plan_anual',
          days: 365,
          amount_cents: 100,
          currency: 'EUR',
          active: true,
          free: false,
        },
      ];

      const result = applyI18nToPlans(plans, mockT);

      expect(result[0]).toMatchObject({
        id: 'plan-1',
        nameKey: 'plan_anual',
        days: 365,
        amount_cents: 100,
        currency: 'EUR',
        active: true,
        free: false,
        name: 'Plan Anual',
      });
    });

    it('should handle empty array', () => {
      const result = applyI18nToPlans([], mockT);
      expect(result).toEqual([]);
    });
  });

  describe('LOCAL_FREE_PLAN', () => {
    it('should have correct structure', () => {
      expect(LOCAL_FREE_PLAN).toMatchObject({
        id: 'free-code-hidden',
        nameKey: 'plan_codigo_oculto',
        days: 15,
        amount_cents: 0,
        currency: 'EUR',
        active: true,
        free: true,
      });
    });
  });

  describe('LOCAL_PAID_PLANS', () => {
    it('should contain only active plans', () => {
      LOCAL_PAID_PLANS.forEach((plan) => {
        expect(plan.active).toBe(true);
      });
    });

    it('should have correct structure for all plans', () => {
      LOCAL_PAID_PLANS.forEach((plan) => {
        expect(plan).toMatchObject({
          id: expect.any(String),
          nameKey: expect.any(String),
          days: expect.any(Number),
          amount_cents: expect.any(Number),
          currency: 'EUR',
          active: true,
          free: false,
        });
      });
    });

    it('should have plan with lifetime days', () => {
      const lifetimePlan = LOCAL_PAID_PLANS.find((p) => p.days >= 50000);
      expect(lifetimePlan).toBeDefined();
      expect(lifetimePlan?.days).toBeGreaterThanOrEqual(50000);
    });
  });
});
