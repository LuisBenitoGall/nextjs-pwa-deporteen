import type { SubscriptionExpiryRow } from '@/lib/subscriptions/expiry-notices';
import {
  computeDaysLeftUntilEnd,
  getSubscriptionExpiryNotice,
  resolveNoticeThresholdDays,
} from '@/lib/subscriptions/expiry-notices';
import { SUBSCRIPTION_EXPIRY_NOTICE_DAYS } from '@/config/constants';

export type NotifiedExpiryEmailState = {
  periodEnd?: string;
  thresholdDays?: number[];
};

export type SubscriptionExpiryEmailCandidate = {
  userId: string;
  subscriptionId: string;
  email: string;
  locale: string | null;
  name: string | null;
  noticeThresholdDays: number;
  daysLeft: number;
  periodEndIso: string;
};

export function parseNotifiedExpiryEmail(raw: unknown): NotifiedExpiryEmailState {
  if (!raw || typeof raw !== 'object') return {};
  const o = raw as Record<string, unknown>;
  const periodEnd = typeof o.periodEnd === 'string' ? o.periodEnd : undefined;
  const thresholdDays = Array.isArray(o.thresholdDays)
    ? o.thresholdDays.filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
    : undefined;
  return { periodEnd, thresholdDays };
}

export function buildNotifiedExpiryEmailUpdate(
  periodEndIso: string,
  existingRaw: unknown,
  thresholdDays: number,
): NotifiedExpiryEmailState {
  const existing = parseNotifiedExpiryEmail(existingRaw);
  const samePeriod = existing.periodEnd === periodEndIso;
  const prev = samePeriod ? (existing.thresholdDays ?? []) : [];
  const merged = [...new Set([...prev, thresholdDays])].sort((a, b) => b - a);
  return { periodEnd: periodEndIso, thresholdDays: merged };
}

export function wasExpiryEmailSentForThreshold(
  periodEndIso: string,
  thresholdDays: number,
  raw: unknown,
): boolean {
  const state = parseNotifiedExpiryEmail(raw);
  if (state.periodEnd !== periodEndIso) return false;
  return (state.thresholdDays ?? []).includes(thresholdDays);
}

/** Suscripción cuyo fin coincide con el aviso agregado (la más próxima). */
export function findNearestExpiringSubscriptionId(
  rows: SubscriptionExpiryRow[],
  noticeEnd: Date,
): string | null {
  const target = noticeEnd.getTime();
  for (const row of rows) {
    const id = (row as SubscriptionExpiryRow & { id?: string }).id;
    if (!id || !row.current_period_end) continue;
    const end = new Date(row.current_period_end).getTime();
    if (Number.isNaN(end)) continue;
    if (end === target) return id;
  }
  return null;
}

export type UserSubscriptionBundle = {
  userId: string;
  email: string;
  locale: string | null;
  name: string | null;
  subs: (SubscriptionExpiryRow & { id: string; notified_expiry_email?: unknown })[];
};

/**
 * Determina si hay que enviar correo para un usuario (misma lógica de umbral que el banner in-app).
 */
export function pickSubscriptionExpiryEmailCandidate(
  bundle: UserSubscriptionBundle,
  now: Date = new Date(),
  noticeDays: readonly number[] = SUBSCRIPTION_EXPIRY_NOTICE_DAYS,
): SubscriptionExpiryEmailCandidate | null {
  const notice = getSubscriptionExpiryNotice(bundle.subs, now, noticeDays);
  if (!notice) return null;

  const periodEndIso = notice.end.toISOString();
  const subscriptionId = findNearestExpiringSubscriptionId(bundle.subs, notice.end);
  if (!subscriptionId) return null;

  const sub = bundle.subs.find((s) => s.id === subscriptionId);
  if (
    wasExpiryEmailSentForThreshold(periodEndIso, notice.noticeThresholdDays, sub?.notified_expiry_email)
  ) {
    return null;
  }

  return {
    userId: bundle.userId,
    subscriptionId,
    email: bundle.email,
    locale: bundle.locale,
    name: bundle.name,
    noticeThresholdDays: notice.noticeThresholdDays,
    daysLeft: notice.daysLeft,
    periodEndIso,
  };
}

/** Expone resolveNoticeThresholdDays para tests unitarios directos. */
export { computeDaysLeftUntilEnd, resolveNoticeThresholdDays };
