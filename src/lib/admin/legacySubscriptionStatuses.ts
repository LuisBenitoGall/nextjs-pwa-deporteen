const LEGACY_STATUSES = new Set([
  'active',
  'trialing',
  'past_due',
  'canceled',
  'cancelled',
  'expired',
  'incomplete',
  'incomplete_expired',
  'unpaid',
]);

export function isLegacySubscriptionStatus(status: unknown): status is string {
  return typeof status === 'string' && LEGACY_STATUSES.has(status.toLowerCase());
}
