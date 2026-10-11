import { describe, it, expect } from 'vitest'
import {
  euros,
  yearsFromDays,
  isLifetime,
  planNameForT,
  applyI18nToPlans,
  LOCAL_PAID_PLANS,
  LOCAL_FREE_PLAN,
  normalizeSubscriptionPlanFromDb,
  normalizeSubscriptionPlansFromDb,
  inferSubscriptionPlanNameKey,
  isSubscriptionPlanI18nKey,
  type Plan,
} from '../subscription-plans'

// ─── euros ────────────────────────────────────────────────────────────────────

describe('euros', () => {
  it('converts cents to euros string with 2 decimals', () => {
    expect(euros(300)).toBe('3.00')
    expect(euros(750)).toBe('7.50')
    expect(euros(2790)).toBe('27.90')
  })

  it('handles zero', () => {
    expect(euros(0)).toBe('0.00')
  })
})

// ─── yearsFromDays ────────────────────────────────────────────────────────────

describe('yearsFromDays', () => {
  it('converts 365 days to 1 year', () => {
    expect(yearsFromDays(365)).toBe(1)
  })

  it('converts 1095 days to 3 years', () => {
    expect(yearsFromDays(1095)).toBe(3)
  })

  it('rounds to 1 decimal place', () => {
    // 730 / 365 = 2.0
    expect(yearsFromDays(730)).toBe(2)
  })
})

// ─── isLifetime ───────────────────────────────────────────────────────────────

describe('isLifetime', () => {
  it('returns true for days >= 50000', () => {
    expect(isLifetime({ days: 50000 })).toBe(true)
    expect(isLifetime({ days: 100000 })).toBe(true)
  })

  it('returns false for normal plans', () => {
    expect(isLifetime({ days: 365 })).toBe(false)
    expect(isLifetime({ days: 1095 })).toBe(false)
    expect(isLifetime({ days: 49999 })).toBe(false)
  })
})

// ─── planNameForT ─────────────────────────────────────────────────────────────

describe('planNameForT', () => {
  const basePlan: Plan = {
    id: 'test',
    nameKey: 'plan_anual',
    days: 365,
    amount_cents: 300,
    currency: 'EUR',
    active: true,
    free: false,
  }
  const t = (key: string) => ({ plan_anual: '1 Año', plan_trianual: '3 Años' }[key] ?? key)

  it('returns existing name without calling t()', () => {
    expect(planNameForT({ ...basePlan, name: 'Custom Name' }, t)).toBe('Custom Name')
  })

  it('calls t(nameKey) when name is absent', () => {
    expect(planNameForT(basePlan, t)).toBe('1 Año')
  })

  it('returns fallback when t() returns empty', () => {
    const tEmpty = () => ''
    expect(planNameForT(basePlan, tEmpty, 'Fallback')).toBe('Fallback')
  })

  it('returns nameKey when t() throws', () => {
    const tThrows = () => { throw new Error('oops') }
    expect(planNameForT(basePlan, tThrows)).toBe('plan_anual')
  })
})

// ─── applyI18nToPlans ─────────────────────────────────────────────────────────

describe('applyI18nToPlans', () => {
  const t = (key: string) => ({ plan_anual: '1 Año' }[key] ?? key)

  it('adds translated name to each plan', () => {
    const result = applyI18nToPlans(LOCAL_PAID_PLANS, t)
    expect(result[0].name).toBe('1 Año')
    expect(result.every(p => typeof p.name === 'string')).toBe(true)
  })

  it('preserves all original plan fields', () => {
    const result = applyI18nToPlans([LOCAL_FREE_PLAN], t)
    expect(result[0].days).toBe(LOCAL_FREE_PLAN.days)
    expect(result[0].free).toBe(true)
  })
})

// ─── LOCAL_PAID_PLANS ─────────────────────────────────────────────────────────

describe('normalizeSubscriptionPlanFromDb', () => {
  it('maps human-readable name and infers nameKey from days', () => {
    const plan = normalizeSubscriptionPlanFromDb({
      id: 'uuid-1',
      name: 'Plan comercial anual',
      days: 365,
      amount_cents: 300,
      currency: 'eur',
      active: true,
      free: false,
    })
    expect(plan.nameKey).toBe('plan_anual')
    expect(plan.name).toBe('Plan comercial anual')
  })

  it('uses name column when it is an i18n key', () => {
    const plan = normalizeSubscriptionPlanFromDb({
      id: 'uuid-2',
      name: 'plan_trianual',
      days: 1095,
      amount_cents: 750,
      currency: 'EUR',
      active: true,
      free: false,
    })
    expect(plan.nameKey).toBe('plan_trianual')
    expect(plan.name).toBeUndefined()
  })

  it('reads name_key from metadata', () => {
    const plan = normalizeSubscriptionPlanFromDb({
      id: 'uuid-3',
      name: '',
      days: 400,
      amount_cents: 300,
      active: true,
      free: false,
      metadata: { name_key: 'plan_anual' },
    })
    expect(plan.nameKey).toBe('plan_anual')
  })

  it('filters inactive and free in normalizeSubscriptionPlansFromDb', () => {
    const rows = normalizeSubscriptionPlansFromDb([
      {
        id: 'a',
        name: 'plan_anual',
        days: 365,
        amount_cents: 300,
        active: true,
        free: false,
      },
      {
        id: 'b',
        name: 'free',
        days: 15,
        amount_cents: 0,
        active: true,
        free: true,
      },
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe('a')
  })
})

describe('planNameForT with DB-shaped rows', () => {
  const t = (key: string) => ({ plan_anual: '1 Año', plan_trianual: '3 Años' }[key] ?? '')

  it('translates when only nameKey is set after normalize', () => {
    const normalized = normalizeSubscriptionPlanFromDb({
      id: 'x',
      name: 'plan_anual',
      days: 365,
      amount_cents: 300,
      active: true,
      free: false,
    })
    expect(planNameForT(normalized, t)).toBe('1 Año')
  })
})

describe('inferSubscriptionPlanNameKey', () => {
  it('detects known durations', () => {
    expect(inferSubscriptionPlanNameKey(365)).toBe('plan_anual')
    expect(inferSubscriptionPlanNameKey(1095)).toBe('plan_trianual')
    expect(inferSubscriptionPlanNameKey(100000)).toBe('plan_siempre')
  })
})

describe('isSubscriptionPlanI18nKey', () => {
  it('distinguishes keys from human titles', () => {
    expect(isSubscriptionPlanI18nKey('plan_anual')).toBe(true)
    expect(isSubscriptionPlanI18nKey('Plan Anual')).toBe(false)
  })
})

describe('LOCAL_PAID_PLANS', () => {
  it('only contains active plans', () => {
    expect(LOCAL_PAID_PLANS.every(p => p.active)).toBe(true)
  })

  it('includes a lifetime plan', () => {
    expect(LOCAL_PAID_PLANS.some(p => isLifetime(p))).toBe(true)
  })
})
