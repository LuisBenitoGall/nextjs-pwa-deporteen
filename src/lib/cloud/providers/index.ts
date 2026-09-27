import 'server-only';

import type { BillableRemoteProvider } from '@/lib/cloud/remote-access';
import { r2RemoteStorageBackend } from '@/lib/cloud/providers/r2-backend';
import { supabaseRemoteStorageBackend } from '@/lib/cloud/providers/supabase-backend';
import type { RemoteStorageBackend } from '@/lib/cloud/providers/types';

const backends: Record<BillableRemoteProvider, RemoteStorageBackend> = {
  r2: r2RemoteStorageBackend,
  supabase: supabaseRemoteStorageBackend,
};

/**
 * Proveedor remoto activo (implementación física). Por defecto R2.
 * Variable: `REMOTE_STORAGE_BACKEND` = `r2` | `supabase`
 */
export function getConfiguredRemoteStorageBackendId(): BillableRemoteProvider {
  const raw = (process.env.REMOTE_STORAGE_BACKEND || 'r2').toLowerCase();
  if (raw === 'supabase') return 'supabase';
  return 'r2';
}

export function getRemoteStorageBackend(id?: BillableRemoteProvider): RemoteStorageBackend {
  const backendId = id ?? getConfiguredRemoteStorageBackendId();
  const backend = backends[backendId];
  if (!backend) {
    throw new Error(`REMOTE_STORAGE_BACKEND no soportado: ${backendId}`);
  }
  return backend;
}

export type { RemoteStorageBackend, RemoteObjectUploadInput, RemoteObjectUploadOutput } from '@/lib/cloud/providers/types';
