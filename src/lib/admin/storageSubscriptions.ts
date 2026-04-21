import type { Database } from '@/lib/database.types';

export type StorageSubscriptionStatus = Database['public']['Tables']['storage_subscriptions']['Row']['status'];

export const STORAGE_SUBSCRIPTION_STATUSES: StorageSubscriptionStatus[] = [
  'active',
  'expired',
  'cancelled',
];

export const STORAGE_SUBSCRIPTION_STATUS_LABELS: Record<StorageSubscriptionStatus, string> = {
  active: 'Activo',
  expired: 'Expirado',
  cancelled: 'Cancelado',
};

export const STORAGE_SUBSCRIPTION_STATUS_CLASSES: Record<StorageSubscriptionStatus, string> = {
  active:
    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-emerald-600/20 text-emerald-400 border border-emerald-600/30',
  expired:
    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-yellow-600/20 text-yellow-400 border border-yellow-600/30',
  cancelled:
    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-red-600/20 text-red-400 border border-red-600/30',
};

export function isStorageSubscriptionStatus(value: unknown): value is StorageSubscriptionStatus {
  return typeof value === 'string' && STORAGE_SUBSCRIPTION_STATUSES.includes(value as StorageSubscriptionStatus);
}

export function parseIsoDateStrict(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
