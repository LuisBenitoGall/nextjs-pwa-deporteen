import 'server-only';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { RemoteObjectDeleteInput, RemoteObjectUploadInput, RemoteObjectUploadOutput, RemoteStorageBackend } from '@/lib/cloud/providers/types';

const MATCHES_BUCKET = 'matches';

export const supabaseRemoteStorageBackend: RemoteStorageBackend = {
  id: 'supabase',

  async uploadObject(input: RemoteObjectUploadInput): Promise<RemoteObjectUploadOutput> {
    const key = `${input.userId}/matches/${input.matchId}/${input.mediaId}${input.ext}`;
    const admin = getSupabaseAdmin();
    const { error } = await admin.storage.from(MATCHES_BUCKET).upload(key, input.body, {
      upsert: false,
      contentType: input.contentType || 'application/octet-stream',
    });
    if (error) throw new Error(error.message);

    return { storageProvider: 'supabase', storagePath: key, objectKey: key };
  },

  async deleteObject(input: RemoteObjectDeleteInput): Promise<void> {
    const path = input.storagePath.startsWith('r2:') ? input.storagePath.slice(3) : input.storagePath;
    const admin = getSupabaseAdmin();
    const { error } = await admin.storage.from(MATCHES_BUCKET).remove([path]);
    if (error) throw new Error(error.message);
  },
};
