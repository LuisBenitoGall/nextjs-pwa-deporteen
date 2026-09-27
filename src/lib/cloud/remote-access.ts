import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { hasQuotaForUpload } from '@/lib/cloud/guardrails';
import { getCloudUsage, type CloudUsageSnapshot } from '@/lib/cloud/usage';

/** Proveedores cuyo almacenamiento remoto consume infraestructura y cuota Deporteen. */
export const BILLABLE_REMOTE_PROVIDERS = ['r2', 'supabase'] as const;
export type BillableRemoteProvider = (typeof BILLABLE_REMOTE_PROVIDERS)[number];

export type RemoteAccessDenyCode =
  | 'UNAUTHORIZED'
  | 'NO_ACTIVE_STORAGE_SUBSCRIPTION'
  | 'QUOTA_EXCEEDED';

export type RemoteAccessResult =
  | { ok: true; usage: CloudUsageSnapshot }
  | { ok: false; code: RemoteAccessDenyCode; status: number; message: string; usage?: CloudUsageSnapshot };

export function httpStatusForRemoteAccess(code: RemoteAccessDenyCode): number {
  switch (code) {
    case 'UNAUTHORIZED':
      return 401;
    case 'NO_ACTIVE_STORAGE_SUBSCRIPTION':
      return 403;
    case 'QUOTA_EXCEEDED':
      return 409;
    default:
      return 403;
  }
}

export function userMessageForRemoteAccess(code: RemoteAccessDenyCode): string {
  switch (code) {
    case 'UNAUTHORIZED':
      return 'No autenticado.';
    case 'NO_ACTIVE_STORAGE_SUBSCRIPTION':
      return 'Sin suscripción de almacenamiento remoto activa.';
    case 'QUOTA_EXCEEDED':
      return 'Cuota de almacenamiento remoto agotada.';
    default:
      return 'Acceso denegado.';
  }
}

/**
 * Valida sesión (vía userId), suscripción vigente y cuota disponible para un archivo.
 * La cuota es por usuario (todos sus jugadores); ver getCloudBytesUsed.
 */
export async function assertRemoteStorageUploadAllowed(
  supabase: SupabaseClient,
  userId: string | null | undefined,
  fileSize: number
): Promise<RemoteAccessResult> {
  if (!userId) {
    return {
      ok: false,
      code: 'UNAUTHORIZED',
      status: 401,
      message: userMessageForRemoteAccess('UNAUTHORIZED'),
    };
  }

  const usage = await getCloudUsage(supabase, userId);
  if (usage.plan_gb <= 0 || usage.bytes_quota <= 0) {
    return {
      ok: false,
      code: 'NO_ACTIVE_STORAGE_SUBSCRIPTION',
      status: 403,
      message: userMessageForRemoteAccess('NO_ACTIVE_STORAGE_SUBSCRIPTION'),
      usage,
    };
  }

  if (!hasQuotaForUpload(usage.bytes_used, usage.bytes_quota, fileSize)) {
    return {
      ok: false,
      code: 'QUOTA_EXCEEDED',
      status: 409,
      message: userMessageForRemoteAccess('QUOTA_EXCEEDED'),
      usage,
    };
  }

  return { ok: true, usage };
}

export function isBillableRemoteProvider(value: string | null | undefined): value is BillableRemoteProvider {
  return !!value && (BILLABLE_REMOTE_PROVIDERS as readonly string[]).includes(value);
}
