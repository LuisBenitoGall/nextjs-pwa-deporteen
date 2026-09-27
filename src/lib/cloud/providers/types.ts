import 'server-only';

import type { BillableRemoteProvider } from '@/lib/cloud/remote-access';

export type RemoteObjectUploadInput = {
  userId: string;
  matchId: string;
  mediaId: string;
  body: Buffer;
  contentType: string;
  ext: string;
};

export type RemoteObjectUploadOutput = {
  storageProvider: BillableRemoteProvider;
  /** Valor persistido en match_media.storage_path (p. ej. `r2:userId/...` o ruta Supabase). */
  storagePath: string;
  /** Clave/objeto en el backend (sin prefijo de proveedor). */
  objectKey: string;
  publicUrl?: string;
};

export type RemoteObjectDeleteInput = {
  storagePath: string;
};

export interface RemoteStorageBackend {
  readonly id: BillableRemoteProvider;
  uploadObject(input: RemoteObjectUploadInput): Promise<RemoteObjectUploadOutput>;
  deleteObject(input: RemoteObjectDeleteInput): Promise<void>;
}
