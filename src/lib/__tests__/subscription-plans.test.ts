import { describe, it, expect } from 'vitest'
import {
  euros,
  yearsFromDays,
  isLifetime,
  planNameForT,
  applyI18nToPlans,
  LOCAL_PAID_PLANS,
  LOCAL_FREE_PLAN,
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

describe('LOCAL_PAID_PLANS', () => {
  it('only contains active plans', () => {
    expect(LOCAL_PAID_PLANS.every(p => p.active)).toBe(true)
  })

  it('includes a lifetime plan', () => {
    expect(LOCAL_PAID_PLANS.some(p => isLifetime(p))).toBe(true)
  })
})
