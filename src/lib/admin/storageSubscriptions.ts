export type StorageSubscriptionStatus = string;

export const STORAGE_SUBSCRIPTION_STATUSES: string[] = [
  'active',
  'expired',
  'cancelled',
  'trialing',
  'past_due',
  'unpaid',
  'incomplete',
  'incomplete_expired',
  'paused',
];

export const STORAGE_SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  expired: 'Expirado',
  cancelled: 'Cancelado',
  trialing: 'En prueba',
  past_due: 'Pago pendiente',
  unpaid: 'Impagado',
  incomplete: 'Incompleta',
  incomplete_expired: 'Incompleta expirada',
  paused: 'Pausada',
};

export const STORAGE_SUBSCRIPTION_STATUS_CLASSES: Record<string, string> = {
  active:
    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-emerald-600/20 text-emerald-400 border border-emerald-600/30',
  expired:
    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-yellow-600/20 text-yellow-400 border border-yellow-600/30',
  cancelled:
    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-red-600/20 text-red-400 border border-red-600/30',
  trialing:
    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-sky-600/20 text-sky-400 border border-sky-600/30',
  past_due:
    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-orange-600/20 text-orange-400 border border-orange-600/30',
  unpaid:
    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-rose-600/20 text-rose-400 border border-rose-600/30',
  incomplete:
    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-violet-600/20 text-violet-400 border border-violet-600/30',
  incomplete_expired:
    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-fuchsia-600/20 text-fuchsia-400 border border-fuchsia-600/30',
  paused:
    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-slate-600/20 text-slate-300 border border-slate-600/30',
};

export function isStorageSubscriptionStatus(value: unknown): value is StorageSubscriptionStatus {
  return typeof value === 'string' && STORAGE_SUBSCRIPTION_STATUSES.includes(value);
}

export function parseIsoDateStrict(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
