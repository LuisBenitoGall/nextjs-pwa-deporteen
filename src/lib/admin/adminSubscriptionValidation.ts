import { parseIsoDateStrict } from '@/lib/admin/storageSubscriptions';

/** Inicio del día actual en UTC (regla admin para current_period_end). */
export function startOfTodayUtcMs(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

export type AdminPeriodEndValidation =
  | { ok: true; iso: string }
  | { ok: false; code: 'missing' | 'invalid' | 'before_today' };

/**
 * Valida current_period_end para altas/ediciones admin:
 * obligatorio, ISO parseable y no anterior al inicio del día UTC actual.
 */
export function validateAdminSubscriptionPeriodEnd(value: unknown): AdminPeriodEndValidation {
  if (value === null || value === undefined) {
    return { ok: false, code: 'missing' };
  }
  if (typeof value !== 'string' || !value.trim()) {
    return { ok: false, code: 'missing' };
  }
  const iso = parseIsoDateStrict(value);
  if (!iso) {
    return { ok: false, code: 'invalid' };
  }
  if (new Date(iso).getTime() < startOfTodayUtcMs()) {
    return { ok: false, code: 'before_today' };
  }
  return { ok: true, iso };
}

export function validateAdminSubscriptionPlanId(planId: unknown): boolean {
  return typeof planId === 'string' && planId.trim().length > 0;
}
