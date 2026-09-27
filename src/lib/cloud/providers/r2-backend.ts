import 'server-only';

import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getR2Bucket, getR2Client, getR2PublicUrl } from '@/lib/r2/client';
import type { RemoteObjectDeleteInput, RemoteObjectUploadInput, RemoteObjectUploadOutput, RemoteStorageBackend } from '@/lib/cloud/providers/types';

function stripR2Prefix(storagePath: string): string {
  return storagePath.startsWith('r2:') ? storagePath.slice(3) : storagePath;
}

export const r2RemoteStorageBackend: RemoteStorageBackend = {
  id: 'r2',

  async uploadObject(input: RemoteObjectUploadInput): Promise<RemoteObjectUploadOutput> {
    const key = `${input.userId}/matches/${input.matchId}/${input.mediaId}${input.ext}`;
    const r2 = getR2Client();
    await r2.send(
      new PutObjectCommand({
        Bucket: getR2Bucket(),
        Key: key,
        Body: input.body,
        ContentType: input.contentType || 'application/octet-stream',
      })
    );

    const storagePath = `r2:${key}`;
    const publicUrl = `${getR2PublicUrl()}/${key}`;
    return { storageProvider: 'r2', storagePath, objectKey: key, publicUrl };
  },

  async deleteObject(input: RemoteObjectDeleteInput): Promise<void> {
    const key = stripR2Prefix(input.storagePath);
    const r2 = getR2Client();
    await r2.send(new DeleteObjectCommand({ Bucket: getR2Bucket(), Key: key }));
  },
};
