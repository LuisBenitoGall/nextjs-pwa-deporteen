import { isSubscriptionActive, type SubscriptionForActiveCheck } from '@/lib/subscriptions/shared';
import { SUBSCRIPTION_EXPIRY_NOTICE_DAYS } from '@/config/constants';

export type SubscriptionExpiryRow = SubscriptionForActiveCheck & {
  plan_days?: number | null;
};

export type SubscriptionExpiryNotice = {
  /** Días naturales hasta el fin del periodo más próximo (techo). */
  daysLeft: number;
  end: Date;
  /** Umbral de aviso que aplica (p. ej. 30, 15, 7, 1). */
  noticeThresholdDays: number;
  urgency: 'info' | 'warning' | 'critical';
};

export const MS_PER_DAY = 24 * 60 * 60 * 1000;
const LIFETIME_PLAN_DAYS = 50_000;

function normalizeNoticeThresholds(noticeDays: readonly number[]): number[] {
  return [...new Set(noticeDays.map((d) => Math.floor(d)).filter((d) => d > 0))].sort(
    (a, b) => a - b,
  );
}

/** Días naturales hasta `end` (techo), coherente con avisos in-app. */
export function computeDaysLeftUntilEnd(end: Date, now: Date = new Date()): number {
  return Math.ceil((end.getTime() - now.getTime()) / MS_PER_DAY);
}

/**
 * Umbral de aviso (30, 15, 7, 1…) para un número de días restantes; null si fuera de ventana.
 * Única definición compartida entre banner in-app y correos programados.
 */
export function resolveNoticeThresholdDays(
  daysLeft: number,
  noticeDays: readonly number[] = SUBSCRIPTION_EXPIRY_NOTICE_DAYS,
): number | null {
  const thresholds = normalizeNoticeThresholds(noticeDays);
  if (!thresholds.length) return null;
  const maxWindow = thresholds[thresholds.length - 1];
  if (daysLeft > maxWindow) return null;
  return thresholds.find((d) => daysLeft <= d) ?? thresholds[thresholds.length - 1];
}

function isLifetimePeriod(row: SubscriptionExpiryRow, end: Date, now: Date): boolean {
  if (row.plan_days != null && row.plan_days >= LIFETIME_PLAN_DAYS) return true;
  const daysUntil = (end.getTime() - now.getTime()) / MS_PER_DAY;
  return daysUntil > 40_000;
}

function urgencyForThreshold(thresholdDays: number): SubscriptionExpiryNotice['urgency'] {
  if (thresholdDays <= 1) return 'critical';
  if (thresholdDays <= 7) return 'critical';
  if (thresholdDays <= 15) return 'warning';
  return 'info';
}

/**
 * Devuelve el aviso in-app más urgente si alguna suscripción activa vence dentro de la ventana configurada.
 * No hay renovación automática: el aviso invita a renovar manualmente.
 */
export function getSubscriptionExpiryNotice(
  rows: SubscriptionExpiryRow[],
  now: Date = new Date(),
  noticeDays: readonly number[] = SUBSCRIPTION_EXPIRY_NOTICE_DAYS,
): SubscriptionExpiryNotice | null {
  if (!rows?.length || !noticeDays.length) return null;

  const thresholds = normalizeNoticeThresholds(noticeDays);
  if (!thresholds.length) return null;

  const endDates: Date[] = [];
  for (const row of rows) {
    if (!isSubscriptionActive(row)) continue;
    if (!row.current_period_end) continue;
    const end = new Date(row.current_period_end);
    if (Number.isNaN(end.getTime())) continue;
    if (isLifetimePeriod(row, end, now)) continue;
    endDates.push(end);
  }

  if (!endDates.length) return null;

  const nearestEnd = endDates.reduce((a, b) => (a.getTime() < b.getTime() ? a : b));
  const daysLeft = computeDaysLeftUntilEnd(nearestEnd, now);
  const noticeThresholdDays = resolveNoticeThresholdDays(daysLeft, thresholds);
  if (noticeThresholdDays == null) return null;

  return {
    daysLeft: Math.max(daysLeft, 0),
    end: nearestEnd,
    noticeThresholdDays,
    urgency: urgencyForThreshold(noticeThresholdDays),
  };
}
