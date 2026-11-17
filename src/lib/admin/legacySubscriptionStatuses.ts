export const LEGACY_SUBSCRIPTION_STATUS_OPTIONS = [
  'active',
  'trialing',
  'past_due',
  'canceled',
  'cancelled',
  'expired',
  'incomplete',
  'incomplete_expired',
  'unpaid',
] as const;

const LEGACY_STATUSES = new Set<string>(LEGACY_SUBSCRIPTION_STATUS_OPTIONS);

export function isLegacySubscriptionStatus(status: unknown): status is string {
  return typeof status === 'string' && LEGACY_STATUSES.has(status.toLowerCase());
}
