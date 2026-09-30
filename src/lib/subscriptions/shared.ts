/** Subscription row shape used for active check (status is text per Stripe). */
export type SubscriptionForActiveCheck = {
  status?: string | boolean | null;
  current_period_end?: string | null;
};

/**
 * Criterio canónico de suscripción activa (decisión Luis 25/09; ver `openspec/specs/subscriptions`).
 * Activa si status ∈ {active, trialing} y (sin `current_period_end` o fin en el futuro).
 * No confundir con filas históricas `cancelled` ni con objetos Stripe Subscription en modo payment.
 */
export function isSubscriptionActive(sub: SubscriptionForActiveCheck | null | undefined): boolean {
  if (!sub) return false;
  const statusStr = String(sub.status ?? '').toLowerCase();
  const isActiveStatus = statusStr === 'active' || statusStr === 'trialing';
  if (!isActiveStatus) return false;
  const end = sub.current_period_end ? new Date(sub.current_period_end) : null;
  return end === null || end.getTime() > Date.now();
}
